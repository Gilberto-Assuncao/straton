-- Who gets told when a work location changes (#83)
--
-- "O gestor do chantier decide quem recebe... o gestor escolhe seus
--  funcionários dentro daquele chantier que receberão as notificações e também
--  escolhe as empresas, e as empresas escolhidas escolhem seus funcionários"
--
-- The audience is chosen, not derived. That matters more than it sounds: a
-- notification sent to one person too many is not noise, it is disclosure —
-- somebody who does not work at Grimbergen learns that Grimbergen changed, who
-- is there, and what was altered.
--
-- Delegation in two levels:
--
--   the location's company  ->  picks its own people, and picks companies
--   each picked company     ->  picks its own people
--
-- The general contractor chooses *companies*, never people inside them. That is
-- not convenience: it is often the case that they may not see the
-- subcontractor's payroll at all, and a screen offering "choose who from
-- company B receives this" would have leaked B's staff list before a single
-- notification was sent.
--
-- The rule below is therefore about reading, not only writing: you see the
-- subscribers of your own company and nobody else's.

create table if not exists public.site_notification_subscribers (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  -- The subscriber's own company, which is not necessarily the location's.
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  unique (site_id, user_id)
);

comment on table public.site_notification_subscribers is
  'Who receives notifications about a work location (#83). Chosen explicitly, never derived from assignments: a chosen list is auditable — "why did I get this" has an answer — and it cannot quietly widen when somebody is added to a team.';

create index if not exists site_notification_subscribers_site_idx
  on public.site_notification_subscribers (site_id, company_id);

alter table public.site_notification_subscribers enable row level security;

/**
 * May my company subscribe people to this location at all?
 *
 * Two ways in: it is our own location, or we are an accepted partner on the
 * project it belongs to. Anything else and the location may as well not exist.
 */
create or replace function private.may_subscribe_to_site(p_site_id uuid, p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites s
    where s.id = p_site_id
      and (
        s.company_id = p_company_id
        or (
          s.project_id is not null
          and exists (
            select 1 from public.project_partners pp
            where pp.project_id = s.project_id
              and pp.company_id = p_company_id
              and pp.status = 'accepted'
          )
        )
      )
  );
$$;

/**
 * You see your own company's subscribers, and only those.
 *
 * This is the privacy boundary, written as a read rule because that is where it
 * would leak. The location's owner can find out *that* a partner company is
 * subscribed — see `site_subscriber_companies` below — and never who.
 */
create policy site_notification_subscribers_read_own_company
  on public.site_notification_subscribers
  for select using ((select private.is_company_member(company_id)));

create policy site_notification_subscribers_admin_insert
  on public.site_notification_subscribers
  for insert with check (
    (select private.is_company_admin(company_id))
    and (select private.may_subscribe_to_site(site_id, company_id))
  );

/**
 * The delete policy, written at the same time as the insert.
 *
 * Four times now a missing delete policy has meant an action that does nothing
 * while the screen reports success — sites, operational report values, report
 * template fields, and notifications could not even be marked as read. Removing
 * somebody from a notification list is exactly the kind of thing nobody
 * re-checks: they would simply keep receiving.
 */
create policy site_notification_subscribers_admin_delete
  on public.site_notification_subscribers
  for delete using ((select private.is_company_admin(company_id)));

grant select, insert, delete on public.site_notification_subscribers to authenticated;

/**
 * A subscriber must belong to the company that subscribed them.
 *
 * Without this, an admin could insert a row naming their own company and
 * somebody else's user id — the insert policy only ever checks the company_id
 * you supplied. That would subscribe a stranger to your location's changes.
 */
create or replace function private.enforce_site_subscriber()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if not exists (
    select 1 from public.company_memberships m
    where m.company_id = new.company_id
      and m.user_id = new.user_id
      and m.status = 'active'
  ) then
    raise exception 'That person is not an active member of this company.'
      using errcode = 'insufficient_privilege';
  end if;

  new.created_by := (select auth.uid());
  return new;
end;
$$;

drop trigger if exists enforce_site_subscriber on public.site_notification_subscribers;
create trigger enforce_site_subscriber
  before insert on public.site_notification_subscribers
  for each row execute function private.enforce_site_subscriber();

/**
 * Which companies are listening, without saying who.
 *
 * The owner needs this to run the delegation — to see that a partner has not
 * chosen anybody yet, and chase them. It returns counts, never names, which is
 * the whole difference between managing the invitation and reading the
 * subcontractor's staff list.
 */
create or replace function public.site_subscriber_companies(p_site_id uuid)
returns table (company_id uuid, company_name text, subscriber_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, count(s.id)::bigint
  from public.companies c
  join public.site_notification_subscribers s on s.company_id = c.id and s.site_id = p_site_id
  where exists (
    -- Only somebody who could subscribe here may ask who else did.
    select 1 from public.company_memberships m
    join public.sites site on site.id = p_site_id
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and (select private.may_subscribe_to_site(p_site_id, m.company_id))
  )
  group by c.id, c.name
  order by c.name;
$$;

revoke all on function public.site_subscriber_companies(uuid) from public;
grant execute on function public.site_subscriber_companies(uuid) to authenticated;

/**
 * Marking a notification as read.
 *
 * There was no update policy, so this was refused on every row, silently — the
 * fifth instance of that pattern. It had not been noticed because nothing in
 * the app tried yet; the unread count simply never went down, which reads like
 * a design decision rather than a bug.
 *
 * Narrow on purpose: you may touch your own rows, and the trigger below makes
 * sure `read_at` is the only thing you can actually change. A notification whose
 * text the recipient can edit is not a record of anything.
 */
create policy notifications_update_own on public.notifications
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update (read_at) on public.notifications to authenticated;

create or replace function private.enforce_notification_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.action_url is distinct from old.action_url
     or new.type is distinct from old.type
     or new.user_id is distinct from old.user_id
     or new.company_id is distinct from old.company_id
     or new.metadata is distinct from old.metadata
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the read state of a notification can be changed.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_notification_update on public.notifications;
create trigger enforce_notification_update
  before update on public.notifications
  for each row execute function private.enforce_notification_update();
