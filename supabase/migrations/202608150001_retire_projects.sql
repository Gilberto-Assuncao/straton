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

-- ---------------------------------------------------------------------------
-- 4. The objects that still spoke about projects from the inside
-- ---------------------------------------------------------------------------
--
-- Sections 1 to 3 handled everything that *names* a project in a policy or a
-- foreign key. These four are different: their dependency is inside a function
-- body, which Postgres does not resolve until the function runs. Creating them
-- succeeded, dropping the table succeeded, and the failure waits for the first
-- caller — which for two of these is a trigger on a table people use every day.
--
-- CI found the report function on the fourth round of this branch. The other
-- three were found by then reading every surviving object rather than waiting
-- to be told again.

/**
 * Worked minutes per work location (#9, #81).
 *
 * Loses its `project_name` column. It was the last consumer of
 * `sites.project_id`, joined so the report could show which job a chantier
 * belonged to — a question that no longer has an answer, because the chantier
 * *is* the job now.
 *
 * Dropped and recreated rather than replaced: the return type changes, and
 * `create or replace` cannot do that.
 */
drop function if exists public.worked_hours_by_site(timestamptz, timestamptz, uuid[]);

create or replace function public.worked_hours_by_site(
  p_from timestamptz,
  p_to timestamptz,
  p_site_ids uuid[] default null
)
returns table (
  site_id uuid,
  site_name text,
  approved_minutes bigint,
  pending_minutes bigint,
  people_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.name,
    coalesce(sum(case when e.status = 'approved' then greatest(0,
      (extract(epoch from (e.ends_at - e.starts_at)) / 60)::int - e.break_minutes) end), 0)::bigint,
    coalesce(sum(case when e.status <> 'approved' then greatest(0,
      (extract(epoch from (e.ends_at - e.starts_at)) / 60)::int - e.break_minutes) end), 0)::bigint,
    count(distinct t.user_id)::bigint
  from public.timesheet_entries e
  join public.timesheets t on t.id = e.timesheet_id
  -- Left join, deliberately. An inner join silently dropped every entry with no
  -- site, so hours worked without a chantier vanished from the report instead of
  -- being reported as unattributed — a smaller number with no explanation is
  -- worse than an honest gap.
  left join public.sites s on s.id = e.site_id
  where e.starts_at >= p_from
    and e.starts_at < p_to
    and (p_site_ids is null or cardinality(p_site_ids) = 0 or e.site_id = any(p_site_ids))
  group by s.id, s.name
  order by 3 desc, s.name nulls last
$$;

revoke all on function public.worked_hours_by_site(timestamptz, timestamptz, uuid[]) from public;
grant execute on function public.worked_hours_by_site(timestamptz, timestamptz, uuid[]) to authenticated;

/**
 * Whose name you may read because you work alongside them.
 *
 * These two are the reason a partner company's technician appears on the site
 * dashboard with a name rather than a blank. They resolved "we share a project"
 * through `project_memberships`; they resolve "we are on the same chantier"
 * through `site_crew` now, which is the same relationship the manager
 * described — people belong to a company, and a location is where they meet.
 *
 * Renamed rather than left with the old names: a function called
 * `shares_project_with_me` that reads `site_crew` is a lie in the one place
 * nobody reads twice.
 */
create or replace function private.shares_location_with_me(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.site_crew theirs
    join public.company_memberships cm on cm.id = theirs.company_membership_id
    join public.site_crew mine on mine.site_id = theirs.site_id
    join public.company_memberships me on me.id = mine.company_membership_id
    where cm.user_id = p_user_id
      and theirs.left_at is null
      and mine.left_at is null
      and me.user_id = (select auth.uid())
  )
$$;

create or replace function private.membership_on_my_location(p_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.site_crew theirs
    join public.sites s on s.id = theirs.site_id
    where theirs.company_membership_id = p_membership_id
      and theirs.left_at is null
      and public.company_membership_exists(s.company_id)
  )
$$;

drop policy if exists users_read_project_collaborators on public.users;
create policy users_read_location_colleagues on public.users
for select to authenticated
using ((select private.shares_location_with_me(id)));

drop policy if exists memberships_read_project_collaborators on public.company_memberships;
create policy memberships_read_location_colleagues on public.company_memberships
for select to authenticated
using ((select private.membership_on_my_location(id)));

drop function if exists private.shares_project_with_me(uuid);
drop function if exists private.membership_on_my_project(uuid);

/**
 * The two triggers that named `project_id` on a row that no longer has one.
 *
 * Both compare the old row with the new to decide whether the *work* changed,
 * and plpgsql resolves `new.project_id` when the trigger fires — so neither
 * would have failed until somebody edited an assignment or a time entry, in
 * production, on a column they had never heard of.
 */
create or replace function public.enforce_assignment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
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

create or replace function private.enforce_entry_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_manager boolean;
  owns_it boolean;
  content_changed boolean;
begin
  -- No JWT: a migration, the seed, or a maintenance task.
  if (select auth.uid()) is null then
    return new;
  end if;

  is_manager := private.can_review_timesheets(new.company_id);

  if tg_op = 'INSERT' then
    if new.status in ('approved', 'rejected') and not is_manager then
      raise exception 'Only a manager can approve or reject time entries.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  -- An entry belongs to one week of one person. Letting either move would be a
  -- way to relabel someone else's hours as your own.
  if new.timesheet_id is distinct from old.timesheet_id
     or new.company_id is distinct from old.company_id then
    raise exception 'An entry cannot be moved to another timesheet.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status is distinct from old.status
     and new.status in ('approved', 'rejected')
     and not is_manager then
    raise exception 'Only a manager can approve or reject time entries.'
      using errcode = 'insufficient_privilege';
  end if;

  -- `site_area_id` joins the comparison as `project_id` leaves it (#77):
  -- moving hours from one floor to another is a change to the work, and the
  -- per-subdivision report is only as trustworthy as that being noticed.
  content_changed := (new.starts_at, new.ends_at, new.break_minutes, new.site_area_id, new.task_id, new.site_id, new.notes)
    is distinct from (old.starts_at, old.ends_at, old.break_minutes, old.site_area_id, old.task_id, old.site_id, old.notes);

  if not content_changed then
    return new;
  end if;

  -- Immutable once approved — including for the manager who approved it, and
  -- including the person whose hours they are. The status column is left out of
  -- this check on purpose: reopening the week is how a correction gets made,
  -- and blocking that would leave a mistake permanent.
  if old.status = 'approved' then
    raise exception 'Approved hours cannot be edited. Reopen the timesheet first.'
      using errcode = 'insufficient_privilege';
  end if;

  owns_it := exists (
    select 1 from public.timesheets t
    where t.id = new.timesheet_id and t.user_id = (select auth.uid())
  );

  if not is_manager then
    if not owns_it then
      raise exception 'You can only edit your own hours.'
        using errcode = 'insufficient_privilege';
    end if;
    -- Waiting for someone to look at it. Editing underneath a reviewer means
    -- they approve a different week from the one they read.
    if old.status = 'submitted' then
      raise exception 'This week is waiting for review. Ask for it to be sent back first.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

-- `project_status` had exactly one column: the one on the table just dropped.
-- Unlike `project_priority`, which `sites.priority` still uses, nothing is left
-- to describe.
drop type if exists public.project_status;

/**
 * The fifth trigger, and the one that says something about how these were
 * found.
 *
 * The first four came from a grep whose output I truncated, so this one was
 * simply not in the list I read. It is the same shape as the others: a content
 * comparison naming `new.project_id`, on a table people file reports into
 * every day, failing only when somebody edits one.
 *
 * The list is exhaustive now, and it was made by matching every
 * `create or replace function` body in the migrations against the objects this
 * file handles rather than by reading and hoping.
 */
create or replace function private.enforce_operational_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_manager boolean;
  owns_it boolean;
  content_changed boolean;
begin
  -- No JWT: a migration or the seed, which has to be able to create history in
  -- any state. Same escape as the timesheet triggers.
  if (select auth.uid()) is null then
    return new;
  end if;

  is_manager := private.is_company_manager(new.company_id);
  owns_it := new.worker_id = (select auth.uid());

  if tg_op = 'INSERT' then
    if not owns_it and not is_manager then
      raise exception 'You can only file a report in your own name.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.status <> 'draft' and not is_manager then
      raise exception 'A new report starts as a draft.'
        using errcode = 'insufficient_privilege';
    end if;
    -- Stamped, not trusted. Otherwise the record of who filed it says whatever
    -- the request said it did.
    new.created_by := (select auth.uid());
    return new;
  end if;

  if new.company_id is distinct from old.company_id
     or new.worker_id is distinct from old.worker_id then
    raise exception 'A report cannot be reassigned to another person.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'submitted' then
      if old.status not in ('draft', 'changes_requested') then
        raise exception 'This report has already been submitted.'
          using errcode = 'check_violation';
      end if;
      if not owns_it and not is_manager then
        raise exception 'Only the worker who filed this report can submit it.'
          using errcode = 'insufficient_privilege';
      end if;
    else
      if not is_manager then
        raise exception 'Only a manager can review a report.'
          using errcode = 'insufficient_privilege';
      end if;

      if new.status in ('under_review', 'approved', 'rejected', 'changes_requested') then
        if old.status not in ('submitted', 'under_review') then
          raise exception 'Only a submitted report can be reviewed.'
            using errcode = 'check_violation';
        end if;
        -- Same second-pair-of-eyes rule as the timesheets, and the same
        -- exception: in a small firm the owner is often the only account, and
        -- a report nobody can ever approve is worse than one they approve
        -- themselves.
        if owns_it and not private.has_company_role(new.company_id, array['owner']) then
          raise exception 'You cannot review your own report.'
            using errcode = 'insufficient_privilege';
        end if;
        new.reviewed_by := (select auth.uid());
        new.reviewed_at := now();
      end if;
    end if;
  end if;

  content_changed := (new.report_date, new.starts_at, new.ends_at, new.break_minutes,
                      new.activity, new.notes, new.site_id,
                      new.template_id, new.team_id, new.client_company_id)
    is distinct from (old.report_date, old.starts_at, old.ends_at, old.break_minutes,
                      old.activity, old.notes, old.site_id,
                      old.template_id, old.team_id, old.client_company_id);

  if content_changed then
    -- Approved is approved, for everyone. Reopening the report is the way back,
    -- and that is a status change with a name against it.
    if old.status = 'approved' then
      raise exception 'An approved report cannot be edited. Reopen it first.'
        using errcode = 'insufficient_privilege';
    end if;
    if not is_manager then
      if not owns_it then
        raise exception 'You can only edit your own report.'
          using errcode = 'insufficient_privilege';
      end if;
      if old.status not in ('draft', 'changes_requested') then
        raise exception 'This report is waiting for review.'
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;
