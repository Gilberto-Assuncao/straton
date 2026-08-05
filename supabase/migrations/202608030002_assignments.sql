-- The agenda: assigning work to people and teams (#23).
--
-- Section 2 of docs/02-architecture/SCHEDULING_AND_DELEGATION.md. This is the
-- table the whole scheduling design was drawn around, and the one the site
-- dashboard, the timesheets and the delegation chain all lean on.
--
-- The chain columns are here from the first migration even though the UI only
-- schedules within your own company for now. parent_assignment_id, chain_depth
-- and delegated_to_company_id are cheap to carry and expensive to retrofit:
-- adding a depth limit and cycle check to a table that already holds live
-- assignments means backfilling values nobody recorded at the time.

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  site_id uuid references public.sites (id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  title text not null,
  instructions text,
  status text not null default 'planned'
    check (status in ('planned', 'sent', 'accepted', 'in_progress', 'done', 'cancelled')),
  created_by uuid references public.users (id) on delete set null,

  -- Delegation. The receiving company sees the child as *theirs*, merely linked
  -- to where it came from — which is what keeps the chain from needing special
  -- cases throughout the code.
  delegated_to_company_id uuid references public.companies (id) on delete set null,
  parent_assignment_id uuid references public.assignments (id) on delete set null,
  chain_depth smallint not null default 0 check (chain_depth between 0 and 5),

  /**
   * The team this was booked as, when it was booked that way.
   *
   * Kept alongside the expanded people rather than instead of them: it lets the
   * interface say "Solar Team" instead of listing five names, without the list
   * of five names ceasing to exist.
   */
  team_id uuid references public.teams (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignments_range check (ends_at > starts_at)
);

create index if not exists assignments_company_window_idx
  on public.assignments (company_id, starts_at, ends_at);
create index if not exists assignments_site_idx on public.assignments (site_id, starts_at);
create index if not exists assignments_parent_idx on public.assignments (parent_assignment_id);

/**
 * Who is actually on the job.
 *
 * Always the people, one row each, even when the booking was made by team. The
 * expansion is materialised at assignment time and never recomputed: work out
 * team membership live and someone who leaves the team tomorrow disappears
 * retroactively from the work they did yesterday, and the timesheet stops
 * agreeing with who was on site. For Belgian compliance that is not acceptable
 * — there has to be a record of who was assigned on the day.
 */
create table if not exists public.assignment_assignees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  company_membership_id uuid not null references public.company_memberships (id) on delete cascade,
  -- Preserves the original intent: booked as a team, or picked person by person.
  source text not null default 'direct' check (source in ('direct', 'team')),
  created_at timestamptz not null default now(),
  constraint assignment_assignees_unique unique (assignment_id, company_membership_id)
);

create index if not exists assignment_assignees_membership_idx
  on public.assignment_assignees (company_membership_id);

alter table public.assignments enable row level security;
alter table public.assignment_assignees enable row level security;

-- Explicit, not inherited from Supabase's default privileges — see the note in
-- 202608010004 and the sweep in tests/rls/grants.test.ts.
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.assignments to service_role;
grant select, insert, update, delete on public.assignment_assignees to authenticated;
grant select, insert, update, delete on public.assignment_assignees to service_role;

-- --- the chain ------------------------------------------------------------

/**
 * Enforces the two rules that make delegation safe: depth, and no company twice.
 *
 * Depth alone does not prevent a loop — A delegates to B, B back to A, A to B
 * again — it only makes it terminate at five. A company appearing twice in one
 * chain means work circling back to someone who already passed it on, which is
 * never a real arrangement and always a mistake worth refusing outright.
 */
create or replace function public.enforce_assignment_chain()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_depth smallint;
  ancestor uuid;
begin
  if new.parent_assignment_id is null then
    new.chain_depth := 0;
    return new;
  end if;

  select a.chain_depth into parent_depth
  from public.assignments a where a.id = new.parent_assignment_id;

  if parent_depth is null then
    raise exception 'The parent assignment does not exist';
  end if;

  new.chain_depth := parent_depth + 1;
  if new.chain_depth > 5 then
    raise exception 'A delegation chain cannot go deeper than 5 levels';
  end if;

  -- Walk up and refuse if this company is already somewhere above.
  for ancestor in
    with recursive up as (
      select a.id, a.company_id, a.parent_assignment_id
      from public.assignments a where a.id = new.parent_assignment_id
      union all
      select a.id, a.company_id, a.parent_assignment_id
      from public.assignments a join up on a.id = up.parent_assignment_id
    )
    select up.company_id from up
  loop
    if ancestor = new.company_id then
      raise exception 'This company is already part of the delegation chain';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists enforce_assignment_chain on public.assignments;
create trigger enforce_assignment_chain
before insert or update of parent_assignment_id, company_id on public.assignments
for each row execute function public.enforce_assignment_chain();

create or replace function public.touch_assignment()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_assignment on public.assignments;
create trigger touch_assignment
before update on public.assignments
for each row execute function public.touch_assignment();

-- --- who sees what --------------------------------------------------------

/**
 * True when the assignment was delegated *by* a company the caller belongs to.
 *
 * This is the "closed box" half of the visibility rule in section 3: the
 * company that handed work down may confirm it exists and see how it is going.
 * What they must not get is the people — that requires the subcontractor to
 * have joined the project, which is a decision that company makes.
 */
create or replace function private.delegated_by_my_company(p_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.assignments parent
    where parent.id = p_parent_id
      and public.company_membership_exists(parent.company_id)
  )
$$;

drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments
for select to authenticated
using (
  (select private.is_company_member(company_id))
  or (parent_assignment_id is not null and (select private.delegated_by_my_company(parent_assignment_id)))
);

drop policy if exists assignments_write on public.assignments;
create policy assignments_write on public.assignments
for insert to authenticated
with check (
  (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor']))
);

-- The assignee may move a job along its status; only a manager may change what
-- the job *is*. Which of the two an update is doing cannot be told apart by a
-- WITH CHECK, so the split is enforced by the trigger below.
drop policy if exists assignments_update on public.assignments;
create policy assignments_update on public.assignments
for update to authenticated
using ((select private.is_company_member(company_id)))
with check ((select private.is_company_member(company_id)));

drop policy if exists assignments_delete on public.assignments;
create policy assignments_delete on public.assignments
for delete to authenticated
using (
  (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor']))
);

create or replace function private.is_assignee(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.assignment_assignees aa
    join public.company_memberships cm on cm.id = aa.company_membership_id
    where aa.assignment_id = p_assignment_id and cm.user_id = (select auth.uid())
  )
$$;

/**
 * Keeps a worker from rewriting the job they were given.
 *
 * Without this, `assignments_update` lets any member of the company edit any
 * assignment — the policy can see who you are but not which columns you
 * touched. The rule: an assignee moves the status, a manager changes the work.
 */
create or replace function public.enforce_assignment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Schema-qualified: the function runs with an empty search_path, and as
  -- SECURITY DEFINER it owns the right to reach into `private`.
  is_manager boolean := private.has_company_role(
    old.company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor']
  );
begin
  if is_manager then
    return new;
  end if;

  if new.title is distinct from old.title
     or new.instructions is distinct from old.instructions
     or new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.site_id is distinct from old.site_id
     or new.project_id is distinct from old.project_id
     or new.company_id is distinct from old.company_id
     or new.parent_assignment_id is distinct from old.parent_assignment_id then
    raise exception 'Only a supervisor can change the work itself';
  end if;

  if new.status is distinct from old.status and not private.is_assignee(old.id) then
    raise exception 'Only someone assigned to this work can change its status';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_assignment_update on public.assignments;
create trigger enforce_assignment_update
before update on public.assignments
for each row execute function public.enforce_assignment_update();

-- --- assignees ------------------------------------------------------------

create or replace function private.assignment_is_mine(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.assignments a
    where a.id = p_assignment_id and public.company_membership_exists(a.company_id)
  )
$$;

drop policy if exists assignment_assignees_read on public.assignment_assignees;
create policy assignment_assignees_read on public.assignment_assignees
for select to authenticated
using ((select private.assignment_is_mine(assignment_id)));

drop policy if exists assignment_assignees_write on public.assignment_assignees;
create policy assignment_assignees_write on public.assignment_assignees
for insert to authenticated
with check (
  (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor']))
  and (select private.assignment_is_mine(assignment_id))
);

drop policy if exists assignment_assignees_delete on public.assignment_assignees;
create policy assignment_assignees_delete on public.assignment_assignees
for delete to authenticated
using (
  (select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor']))
  and (select private.assignment_is_mine(assignment_id))
);
