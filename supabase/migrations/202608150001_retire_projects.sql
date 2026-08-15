-- Projects are retired (#77)
--
-- "um único menu Locais de trabalho, onde você cria a Obra e as subdivisões
--  dentro dela" — and, asked directly about the eleven rows in the table:
--  "os projetos existentes foram testes, pode excluir".
--
-- This is the last of the five changes the issue was broken into, and the only
-- destructive one. Everything a project used to hold now lives somewhere that
-- outlives it:
--
--   budget, estimated hours, priority   -> sites            (202608100002)
--   the subdivisions of a job           -> site_areas       (202608100002)
--   which hours belong where            -> site_area_id     (202608100006)
--   partner companies                   -> site_partners    (202608120002)
--   who is on the job                   -> site_crew        (202608120002)
--
-- What is left of `projects` is a name and a status, on rows nobody uses. The
-- columns pointing at it are dropped rather than nulled, because a nullable
-- foreign key to a table that no longer exists is not a smaller version of the
-- feature — it is a column that can only ever be null, and the next person has
-- to work out why it is there.

-- ---------------------------------------------------------------------------
-- 1. The policies and helpers that spoke about projects
-- ---------------------------------------------------------------------------

-- `sites_read_partner` and `site_areas_read_partner` each kept a legacy clause
-- so the project route worked during the transition (202608120002). The
-- transition is over: they are rewritten to the location answer alone, which
-- is the version their tests were always describing.
drop policy if exists sites_read_partner on public.sites;
create policy sites_read_partner on public.sites
for select to authenticated
using ((select private.is_accepted_site_partner(id)));

drop policy if exists site_areas_read_partner on public.site_areas;
create policy site_areas_read_partner on public.site_areas
  for select using ((select private.is_accepted_site_partner(site_areas.site_id)));

/**
 * May my company subscribe people to this location? (#83)
 *
 * Same two ways in, with the project half removed now that there is no project
 * to be a partner on.
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
      )
  );
$$;

/**
 * An invitation names a company, so that company stays readable to the side
 * reading the invitation. Only site invitations exist now.
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
  )
$$;

drop policy if exists projects_read_partner on public.projects;
drop policy if exists project_memberships_tenant_insert on public.project_memberships;

-- ---------------------------------------------------------------------------
-- 2. Nothing points at a project any more
-- ---------------------------------------------------------------------------
--
-- After the policies above, not before. A policy that mentions a column is a
-- dependency on it, and Postgres refuses the drop while one exists — which is
-- exactly how the first version of this migration failed in CI:
--
--   cannot drop column project_id of table sites because other objects
--   depend on it
--
-- Note the second line of that error: `site_areas_read_partner` depends on
-- `sites.project_id` even though it is a policy on another table, because it
-- reached through a subquery. Dropping a column takes every policy that ever
-- mentioned it, on any table, with it.
--
-- The timesheet columns go first among these: they are the ones carrying real
-- hours, and if any of this is going to fail it should fail before anything
-- else has been taken apart.
alter table public.timesheet_entries drop column if exists project_id;
alter table public.time_sessions     drop column if exists project_id;
alter table public.tasks             drop column if exists project_id;
alter table public.operational_reports drop column if exists project_id;
alter table public.assignments       drop column if exists project_id;
alter table public.sites             drop column if exists project_id;

-- ---------------------------------------------------------------------------
-- 3. The tables
-- ---------------------------------------------------------------------------

-- `project_memberships` and `project_partners` cascade from `projects`, but
-- they are dropped by name rather than left to `cascade` to find: a drop that
-- lists what it removes can be read and checked, and one that does not is a
-- surprise waiting in whatever else happens to depend on it.
drop table if exists public.project_memberships;
drop table if exists public.project_partners;

drop function if exists private.is_accepted_project_partner(uuid);
drop function if exists private.is_pending_project_partner(uuid);
drop function if exists private.is_project_invitation_counterpart(uuid);
drop function if exists private.owns_project(uuid);
drop function if exists public.enforce_project_partner_transition();

drop table if exists public.projects;

-- `project_priority` outlives the table that introduced it: `sites.priority`
-- has used it since 202608100002. Dropping the type here would take the
-- location's priority with it.
comment on type public.project_priority is
  'Priority of a work location. Named for the projects it was introduced with (#77 retired those); kept rather than renamed, because renaming a type in use rewrites every column that depends on it for a cosmetic gain.';
