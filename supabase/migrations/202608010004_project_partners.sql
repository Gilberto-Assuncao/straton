-- Inviting a partner company onto a project (#33).
--
-- company_relationships says two companies work together. This says a specific
-- partner is on a specific project — which is what actually grants the partner
-- sight of the project and its sites, and the right to put their own people on
-- it. Keeping the two separate is deliberate: being someone's subcontractor
-- must not, by itself, open every project they run.
--
-- The invite is a handshake. The owner invites; the partner accepts. Only
-- 'accepted' grants anything, so a company cannot be pulled into someone else's
-- project — and the resulting access is a decision that company made.

create table if not exists public.project_partners (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- The invited company.
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Denormalised from projects.company_id so policies on this table never have
  -- to read projects, which is itself governed by a policy that reads this one.
  owner_company_id uuid not null references public.companies (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined', 'revoked')),
  invited_by uuid references public.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint project_partners_not_self check (company_id <> owner_company_id),
  constraint project_partners_unique unique (project_id, company_id)
);

create index if not exists project_partners_company_idx on public.project_partners (company_id, status);
create index if not exists project_partners_project_idx on public.project_partners (project_id);

alter table public.project_partners enable row level security;

-- Granted explicitly rather than left to Supabase's default privileges.
--
-- RLS decides which *rows* a role may touch; a grant decides whether it may
-- touch the table at all, and without one every policy below is unreachable.
-- The hosted project happens to have these already, from a default-privileges
-- rule that does not apply when migrations are replayed from empty — so the
-- table works there and fails anywhere provisioned from this file. CI caught
-- exactly that.
--
-- `anon` is deliberately absent: nothing here should be readable without a
-- session, and no policy grants it anything anyway.
grant select, insert, update, delete on public.project_partners to authenticated;
grant select, insert, update, delete on public.project_partners to service_role;

create or replace function private.is_accepted_project_partner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.project_partners pp
    where pp.project_id = p_project_id
      and pp.status = 'accepted'
      and public.company_membership_exists(pp.company_id)
  )
$$;

-- Invited but not yet answered: enough to see the project's name so the
-- invitation is not a blind yes/no, and nothing more.
create or replace function private.is_pending_project_partner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.project_partners pp
    where pp.project_id = p_project_id
      and pp.status = 'invited'
      and public.company_membership_exists(pp.company_id)
  )
$$;

-- --- project_partners itself ---------------------------------------------

drop policy if exists project_partners_read on public.project_partners;
create policy project_partners_read on public.project_partners
for select to authenticated
using (
  (select public.company_membership_exists(owner_company_id))
  or (select public.company_membership_exists(company_id))
);

-- Only the owner invites, and only onto their own project. owner_company_id is
-- checked against the project rather than trusted from the client, so it cannot
-- be used to forge an invitation on someone else's project.
drop policy if exists project_partners_owner_insert on public.project_partners;
create policy project_partners_owner_insert on public.project_partners
for insert to authenticated
with check (
  (select public.company_membership_exists(owner_company_id))
  and owner_company_id = (select p.company_id from public.projects p where p.id = project_id)
);

-- Both sides may update: the owner to revoke, the partner to accept or decline.
-- Which transitions each side may make is enforced by the trigger below —
-- WITH CHECK cannot see the previous row.
drop policy if exists project_partners_update on public.project_partners;
create policy project_partners_update on public.project_partners
for update to authenticated
using (
  (select public.company_membership_exists(owner_company_id))
  or (select public.company_membership_exists(company_id))
)
with check (
  (select public.company_membership_exists(owner_company_id))
  or (select public.company_membership_exists(company_id))
);

drop policy if exists project_partners_owner_delete on public.project_partners;
create policy project_partners_owner_delete on public.project_partners
for delete to authenticated
using ((select public.company_membership_exists(owner_company_id)));

create or replace function public.enforce_project_partner_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_is_owner boolean := public.company_membership_exists(old.owner_company_id);
  actor_is_partner boolean := public.company_membership_exists(old.company_id);
begin
  -- Nobody re-points an invitation at a different project or company; that
  -- would launder an accepted answer into access somewhere else.
  if new.project_id <> old.project_id
     or new.company_id <> old.company_id
     or new.owner_company_id <> old.owner_company_id then
    raise exception 'A project invitation cannot be moved to another project or company';
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

drop trigger if exists enforce_project_partner_transition on public.project_partners;
create trigger enforce_project_partner_transition
before update on public.project_partners
for each row execute function public.enforce_project_partner_transition();

-- --- what an accepted partner gains --------------------------------------

drop policy if exists projects_read_partner on public.projects;
create policy projects_read_partner on public.projects
for select to authenticated
using (
  (select private.is_accepted_project_partner(id))
  or (select private.is_pending_project_partner(id))
);

drop policy if exists sites_read_partner on public.sites;
create policy sites_read_partner on public.sites
for select to authenticated
using (project_id is not null and (select private.is_accepted_project_partner(project_id)));

-- An invitation names a company, so that company has to be readable to the
-- side reading the invitation. Today it always is — you may only invite a
-- company you already have a relationship with — but nothing in the schema
-- says so, and an invitation rendered without the sender's name is worse than
-- no invitation at all.
create or replace function private.is_project_invitation_counterpart(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.project_partners pp
    where (pp.owner_company_id = p_company_id and public.company_membership_exists(pp.company_id))
       or (pp.company_id = p_company_id and public.company_membership_exists(pp.owner_company_id))
  )
$$;

drop policy if exists companies_read_project_invitation on public.companies;
create policy companies_read_project_invitation on public.companies
for select to authenticated
using ((select private.is_project_invitation_counterpart(id)));

-- Tightens an insert that was previously unbounded: the old policy checked only
-- that the row carried your own company_id, never that you had any business on
-- that project. Harmless while project ids were undiscoverable — the policies
-- above are exactly what ends that.
drop policy if exists project_memberships_tenant_insert on public.project_memberships;
create policy project_memberships_tenant_insert on public.project_memberships
for insert to authenticated
with check (
  (select private.is_company_member(company_id))
  and (
    (select private.owns_project(project_id))
    or (select private.is_accepted_project_partner(project_id))
  )
);
