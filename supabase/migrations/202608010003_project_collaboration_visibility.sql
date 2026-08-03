-- Lets a project owner see who a partner company put on their project.
--
-- Until now project_memberships was readable only by the company that owns the
-- membership row, so when a subcontractor assigned one of their people to our
-- project, the assignment was invisible to us — the project owner could not see
-- who was coming to their own site.
--
-- The line this migration draws is the one from
-- docs/02-architecture/SCHEDULING_AND_DELEGATION.md section 3: the subcontractor
-- assigning someone is the consent event. It opens exactly that person, on
-- exactly that project. It does not open the partner's workforce, their hours,
-- their teams, or their employment records — see tests/rls/project-collaboration.test.ts,
-- where the negative cases outnumber the positive one.
--
-- Every parameter is prefixed `p_`. A parameter named after a column of a table
-- in the same query resolves in favour of the column, which in migration
-- 202608010001 silently turned a comparison into a tautology and made every
-- company in the database readable.

create or replace function private.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.projects p
    where p.id = p_project_id
      and public.company_membership_exists(p.company_id)
  )
$$;

create or replace function private.shares_project_with_me(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.project_memberships pm
    join public.company_memberships cm on cm.id = pm.company_membership_id
    join public.projects p on p.id = pm.project_id
    where cm.user_id = p_user_id
      and pm.left_at is null
      and public.company_membership_exists(p.company_id)
  )
$$;

-- The app reads a collaborator's name through
-- project_memberships -> company_memberships -> users, so all three tables need
-- a policy. Leaving the middle one closed makes the join return nothing while
-- every individual policy looks correct.
create or replace function private.membership_on_my_project(p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.project_memberships pm
    join public.projects p on p.id = pm.project_id
    where pm.company_membership_id = p_membership_id
      and pm.left_at is null
      and public.company_membership_exists(p.company_id)
  )
$$;

drop policy if exists project_memberships_project_owner_read on public.project_memberships;
create policy project_memberships_project_owner_read on public.project_memberships
for select to authenticated
using ((select private.owns_project(project_id)));

drop policy if exists users_read_project_collaborators on public.users;
create policy users_read_project_collaborators on public.users
for select to authenticated
using ((select private.shares_project_with_me(id)));

drop policy if exists memberships_read_project_collaborators on public.company_memberships;
create policy memberships_read_project_collaborators on public.company_memberships
for select to authenticated
using ((select private.membership_on_my_project(id)));
