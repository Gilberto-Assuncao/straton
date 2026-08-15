-- Partner companies and crew are allocated to a work location (#77)
--
-- "Equipes e parceiros pertencem à empresa, ela apenas aloca eles nos chantier"
--
-- That sentence settles a question the schema had answered the other way round.
-- Today a person is a *member of a project* and a company is a *partner on a
-- project* — as if the job created the relationship. It does not. The
-- electrician is employed by the company whether or not there is a chantier
-- open, and the subcontractor is a business relationship that outlives any one
-- site. What a chantier gets is an allocation: these people, that company, this
-- place, for now.
--
-- So both move to the location, and both are named for what they are rather
-- than for belonging. `site_crew`, not `site_memberships`: the crew on a site
-- today is a fact about today, and calling it membership is the exact confusion
-- this change exists to remove.
--
-- `projects` is untouched here. The tables it owns keep working, the backfill
-- reads from them, and retiring the menu is the next change — deliberately not
-- this one, because if allocation is wrong it must be possible to see the old
-- answer beside the new one.

-- ---------------------------------------------------------------------------
-- 1. Partner companies, allocated to a location
-- ---------------------------------------------------------------------------

create table if not exists public.site_partners (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  -- The invited company.
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Denormalised from sites.company_id so policies on this table never have to
  -- read `sites`, which is itself governed by a policy that reads this one.
  owner_company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'revoked')),
  invited_by uuid references public.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint site_partners_not_self check (company_id <> owner_company_id),
  constraint site_partners_unique unique (site_id, company_id)
);

comment on table public.site_partners is
  'Partner companies allocated to a work location (#77). The relationship itself lives at company level in company_relationships; this row says that relationship is being used on this chantier.';

create index if not exists site_partners_company_idx on public.site_partners (company_id, status);
create index if not exists site_partners_site_idx on public.site_partners (site_id);

alter table public.site_partners enable row level security;

-- Granted explicitly. RLS decides which rows a role may touch; a grant decides
-- whether it may touch the table at all, and without one every policy below is
-- unreachable. This project has now been bitten by the missing half of that
-- pair twice in three days — most recently `sites` having a delete policy and
-- no delete grant, which made deleting a work location impossible in every
-- environment (202608100007).
grant select, insert, update, delete on public.site_partners to authenticated;
grant select, insert, update, delete on public.site_partners to service_role;

/**
 * An accepted partner on this location, whose company you belong to.
 *
 * Mirrors `is_accepted_project_partner` one level over. Both exist for now:
 * the project version still governs `projects`, and deleting it while its
 * policies are live would take the collaboration down with it.
 */
create or replace function private.is_accepted_site_partner(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.site_partners sp
    where sp.site_id = p_site_id
      and sp.status = 'accepted'
      and public.company_membership_exists(sp.company_id)
  )
$$;

-- Invited but not yet answered: enough to see the location's name so the
-- invitation is not a blind yes/no, and nothing more.
create or replace function private.is_pending_site_partner(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.site_partners sp
    where sp.site_id = p_site_id
      and sp.status = 'invited'
      and public.company_membership_exists(sp.company_id)
  )
$$;

create policy site_partners_read on public.site_partners
for select to authenticated
using (
  (select public.company_membership_exists(owner_company_id))
  or (select public.company_membership_exists(company_id))
);

-- Only the owner invites, and only onto their own location. `owner_company_id`
-- is checked against the location rather than trusted from the client, so it
-- cannot be used to forge an invitation onto somebody else's chantier.
create policy site_partners_owner_insert on public.site_partners
for insert to authenticated
with check (
  (select public.company_membership_exists(owner_company_id))
  and owner_company_id = (select s.company_id from public.sites s where s.id = site_id)
);

-- Both sides may update: the owner to revoke, the partner to accept or decline.
-- Which transitions each side may make is enforced by the trigger below —
-- WITH CHECK cannot see the previous row.
create policy site_partners_update on public.site_partners
for update to authenticated
using (
  (select public.company_membership_exists(owner_company_id))
  or (select public.company_membership_exists(company_id))
)
with check (
  (select public.company_membership_exists(owner_company_id))
  or (select public.company_membership_exists(company_id))
);

create policy site_partners_owner_delete on public.site_partners
for delete to authenticated
using ((select public.company_membership_exists(owner_company_id)));

create or replace function public.enforce_site_partner_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_owner boolean := public.company_membership_exists(old.owner_company_id);
  actor_is_partner boolean := public.company_membership_exists(old.company_id);
begin
  -- Nobody re-points an invitation at a different location or company; that
  -- would launder an accepted answer into access somewhere else.
  if new.site_id <> old.site_id
     or new.company_id <> old.company_id
     or new.owner_company_id <> old.owner_company_id then
    raise exception 'An invitation cannot be moved to another work location or company';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('accepted', 'declined') then
      if not actor_is_partner then
        raise exception 'Only the invited company can answer an invitation';
      end if;
      if old.status <> 'invited' then
        raise exception 'This invitation has already been answered';
      end if;
      new.responded_at := now();
    elsif new.status = 'revoked' then
      if not actor_is_owner then
        raise exception 'Only the inviting company can revoke an invitation';
      end if;
    else
      raise exception 'An invitation cannot return to %', new.status;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_site_partner_transition on public.site_partners;
create trigger enforce_site_partner_transition
before update on public.site_partners
for each row execute function public.enforce_site_partner_transition();

-- ---------------------------------------------------------------------------
-- 2. Crew, allocated to a location
-- ---------------------------------------------------------------------------

/**
 * Who is working at this location, from whichever company.
 *
 * `company_membership_id` rather than `user_id`, because the same person can
 * be employed by two companies on the same chantier — a working owner who
 * subcontracts to himself is ordinary here — and the hours have to be
 * attributable to the right employer.
 *
 * `left_at` rather than a delete: who was on the job, and when they came off
 * it, is the answer to a chain-liability question on a Belgian site. The same
 * reasoning that keeps a revoked partner's row.
 */
create table if not exists public.site_crew (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  -- The crew member's own company, which on a chantier with partners is not
  -- necessarily the location's.
  company_id uuid not null references public.companies (id) on delete cascade,
  company_membership_id uuid not null references public.company_memberships (id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left_at is null or left_at >= joined_at)
);

comment on table public.site_crew is
  'Who is allocated to a work location right now (#77). People are employed by a company; this says which chantier they are on. Named crew rather than membership because being on a site today is a fact about today.';

create unique index if not exists site_crew_one_active
  on public.site_crew (site_id, company_membership_id) where left_at is null;
create index if not exists site_crew_site_idx on public.site_crew (site_id) where left_at is null;

alter table public.site_crew enable row level security;

grant select, insert, update, delete on public.site_crew to authenticated;
grant select, insert, update, delete on public.site_crew to service_role;

/**
 * Everyone allocated to the location can see who else is, across companies.
 *
 * That is deliberate and it is narrower than it looks: it exposes the crew of
 * *this chantier*, which is exactly what the people on it need to know, and
 * nothing about either company's wider staff. It is the opposite decision from
 * the notification subscribers of #83, and for a reason — a subscriber list is
 * a claim about who reads about the site, while the crew is who is standing on
 * it, and pretending the second is private on a shared chantier would be a
 * fiction anyone can disprove by looking around.
 */
create policy site_crew_read on public.site_crew
for select to authenticated
using (
  (select private.is_company_member(company_id))
  or (select private.is_accepted_site_partner(site_id))
  or exists (
    select 1 from public.sites s
    where s.id = site_crew.site_id and (select private.is_company_member(s.company_id))
  )
);

/**
 * You allocate your own people, onto a location you own or have accepted work
 * on.
 *
 * Both halves are needed. `is_company_member(company_id)` alone would let a
 * partner company put its people on any chantier whose id it could guess; the
 * site test alone would let the location's owner allocate somebody else's
 * staff, which is the boundary #83 spent its whole design defending.
 */
create policy site_crew_insert on public.site_crew
for insert to authenticated
with check (
  (select private.is_company_admin(company_id))
  and (
    exists (
      select 1 from public.sites s
      where s.id = site_id and (select private.is_company_member(s.company_id))
    )
    or (select private.is_accepted_site_partner(site_id))
  )
);

create policy site_crew_update on public.site_crew
for update to authenticated
using ((select private.is_company_admin(company_id)))
with check ((select private.is_company_admin(company_id)));

-- Written now rather than discovered missing later. Without it RLS refuses
-- every delete silently: nothing is removed, no error is raised, and the screen
-- reports success — the failure this project has now found five times.
create policy site_crew_delete on public.site_crew
for delete to authenticated
using ((select private.is_company_admin(company_id)));

/**
 * `company_id` must be the membership's own.
 *
 * Left to the caller it is just a value they sent, and the insert policy only
 * ever checks the value it was given — so somebody could allocate another
 * company's employee by claiming they were theirs. Same shape, same fix, as
 * `enforce_site_area` two migrations ago.
 */
create or replace function private.enforce_site_crew()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_company uuid;
begin
  select cm.company_id into owner_company
  from public.company_memberships cm where cm.id = new.company_membership_id;

  if owner_company is null then
    raise exception 'That person is not a member of any company.' using errcode = 'foreign_key_violation';
  end if;

  -- Migrations and seeds run with no end user; the rule is about people.
  if (select auth.uid()) is not null and new.company_id is distinct from owner_company then
    raise exception 'Somebody can only be allocated by the company that employs them.'
      using errcode = 'insufficient_privilege';
  end if;

  new.company_id := owner_company;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_site_crew on public.site_crew;
create trigger enforce_site_crew
  before insert or update on public.site_crew
  for each row execute function private.enforce_site_crew();

-- ---------------------------------------------------------------------------
-- 3. Backfill, from the project answer to the location answer
-- ---------------------------------------------------------------------------

-- A project's partners become partners on each of that project's locations.
-- One project with three chantiers means the subcontractor was on all three,
-- which is what the old model was actually saying.
insert into public.site_partners (site_id, company_id, owner_company_id, status, invited_by, note, created_at, responded_at)
select s.id, pp.company_id, pp.owner_company_id, pp.status, pp.invited_by, pp.note, pp.created_at, pp.responded_at
from public.project_partners pp
join public.sites s on s.project_id = pp.project_id
on conflict (site_id, company_id) do nothing;

insert into public.site_crew (site_id, company_id, company_membership_id, role, joined_at, left_at, created_at)
select s.id, cm.company_id, pm.company_membership_id, pm.role, pm.joined_at, pm.left_at, pm.created_at
from public.project_memberships pm
join public.sites s on s.project_id = pm.project_id
join public.company_memberships cm on cm.id = pm.company_membership_id
-- The partial unique index only covers active rows, so `on conflict` cannot
-- carry them: filter instead, and let history through unchecked.
where pm.left_at is not null
   or not exists (
     select 1 from public.site_crew existing
     where existing.site_id = s.id
       and existing.company_membership_id = pm.company_membership_id
       and existing.left_at is null
   );

-- ---------------------------------------------------------------------------
-- 4. What used to be decided by the project is now decided by the location
-- ---------------------------------------------------------------------------

-- Reading the location: was "a partner on its project", becomes "a partner on
-- it". Both are kept for now — the project route still has to work until the
-- menu goes — but the location route no longer depends on there being a
-- project at all, which was the last thing making `project_id` load-bearing.
drop policy if exists sites_read_partner on public.sites;
create policy sites_read_partner on public.sites
for select to authenticated
using (
  (select private.is_accepted_site_partner(id))
  or (select private.is_pending_site_partner(id))
  or (project_id is not null and (select private.is_accepted_project_partner(project_id)))
);

-- Subdivisions follow the location exactly, which is the point: any rule that
-- differed would be a way to reach through one to the other.
drop policy if exists site_areas_read_partner on public.site_areas;
create policy site_areas_read_partner on public.site_areas
for select using (
  (select private.is_accepted_site_partner(site_areas.site_id))
  or exists (
    select 1 from public.sites s
    where s.id = site_areas.site_id
      and s.project_id is not null
      and (select private.is_accepted_project_partner(s.project_id))
  )
);

/**
 * May my company subscribe people to this location at all? (#83)
 *
 * Same two ways in, with the partnership read from the location rather than
 * from its project. Left as one function so the notification rules keep having
 * exactly one place to be wrong.
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
        or exists (
          select 1 from public.site_partners sp
          where sp.site_id = s.id
            and sp.company_id = p_company_id
            and sp.status = 'accepted'
        )
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
 * An invitation names a company, so that company has to be readable to the
 * side reading the invitation.
 *
 * Extends the project version rather than replacing it, because both kinds of
 * invitation exist until the menu goes.
 */
create or replace function private.is_invitation_counterpart(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.site_partners sp
    where (sp.owner_company_id = p_company_id and public.company_membership_exists(sp.company_id))
       or (sp.company_id = p_company_id and public.company_membership_exists(sp.owner_company_id))
  ) or (select private.is_project_invitation_counterpart(p_company_id))
$$;

drop policy if exists companies_read_project_invitation on public.companies;
create policy companies_read_invitation on public.companies
for select to authenticated
using ((select private.is_invitation_counterpart(id)));
