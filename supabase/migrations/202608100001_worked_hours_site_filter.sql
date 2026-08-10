-- The worked-hours report over a chosen set of work locations (#77)
--
-- "em relatórios, gestão ou contabilidade o gestor possa ver todos os locais,
-- ou se preferir somente o relatório de 1, ele define"
--
-- So the report takes a *set* of locations: null for all of them, or an array
-- to narrow. Not a single optional location — one is just an array of length
-- one, and building the single case first is how a screen ends up with a
-- selector that cannot express "these three".
--
-- The filter narrows; it never widens. Both functions stay `security invoker`,
-- so the caller's own RLS still decides which rows exist at all, and passing
-- somebody else's location id returns nothing rather than their hours. That
-- ordering is the whole safety argument: a filter that decided visibility would
-- be access control living in a query string, which is the pattern the #65
-- sweep existed to remove.
--
-- Dropped and recreated rather than overloaded. Adding a defaulted third
-- parameter to a function that already exists with two leaves both callable,
-- and a two-argument call then matches both — Postgres refuses it as ambiguous
-- at call time, which is a runtime failure in a report nobody would see until
-- month end.

drop function if exists public.worked_hours_by_person(timestamptz, timestamptz);
drop function if exists public.worked_hours_by_site(timestamptz, timestamptz);

create or replace function public.worked_hours_by_person(
  p_from timestamptz,
  p_to timestamptz,
  p_site_ids uuid[] default null
)
returns table (
  company_membership_id uuid,
  user_id uuid,
  person_name text,
  job_title text,
  approved_minutes bigint,
  submitted_minutes bigint,
  draft_minutes bigint,
  entry_count bigint,
  first_entry timestamptz,
  last_entry timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    cm.id,
    u.id,
    u.name,
    cm.job_title,
    -- greatest(0, ...) because a break longer than the shift would otherwise
    -- subtract into negative minutes and quietly reduce someone else's total
    -- once these are summed.
    coalesce(sum(case when e.status = 'approved' then greatest(0,
      (extract(epoch from (e.ends_at - e.starts_at)) / 60)::int - e.break_minutes) end), 0)::bigint,
    coalesce(sum(case when e.status = 'submitted' then greatest(0,
      (extract(epoch from (e.ends_at - e.starts_at)) / 60)::int - e.break_minutes) end), 0)::bigint,
    coalesce(sum(case when e.status = 'draft' then greatest(0,
      (extract(epoch from (e.ends_at - e.starts_at)) / 60)::int - e.break_minutes) end), 0)::bigint,
    count(e.id)::bigint,
    min(e.starts_at),
    max(e.starts_at)
  from public.timesheet_entries e
  join public.timesheets t on t.id = e.timesheet_id
  join public.company_memberships cm on cm.user_id = t.user_id and cm.company_id = e.company_id
  join public.users u on u.id = t.user_id
  where e.starts_at >= p_from
    and e.starts_at < p_to
    -- An empty array means the same as no array. A multi-select that has been
    -- cleared should show everything, not an empty report the manager reads as
    -- "nobody worked".
    and (p_site_ids is null or cardinality(p_site_ids) = 0 or e.site_id = any(p_site_ids))
  group by cm.id, u.id, u.name, cm.job_title
  order by u.name
$$;

/**
 * The same period broken down by site.
 *
 * Separate function rather than extra columns: a company asks "how many hours
 * did Le Parc cost" for invoicing, which is a different question from "what did
 * we pay each person", and joining them into one result would make both harder
 * to read.
 */
create or replace function public.worked_hours_by_site(
  p_from timestamptz,
  p_to timestamptz,
  p_site_ids uuid[] default null
)
returns table (
  site_id uuid,
  site_name text,
  project_name text,
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
    p.name,
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
  left join public.projects p on p.id = s.project_id
  where e.starts_at >= p_from
    and e.starts_at < p_to
    -- Note what this does to the unattributed row: `= any(...)` is false for a
    -- null site_id, so narrowing to named locations drops hours booked against
    -- no location at all. That is the right answer — those hours are not part
    -- of any location the manager picked — and it is the same predicate used by
    -- the per-person function above, so the two halves of the report always
    -- agree on which entries they are describing.
    and (p_site_ids is null or cardinality(p_site_ids) = 0 or e.site_id = any(p_site_ids))
  group by s.id, s.name, p.name
  order by 4 desc, s.name nulls last
$$;

revoke all on function public.worked_hours_by_person(timestamptz, timestamptz, uuid[]) from public;
revoke all on function public.worked_hours_by_site(timestamptz, timestamptz, uuid[]) from public;
grant execute on function public.worked_hours_by_person(timestamptz, timestamptz, uuid[]) to authenticated;
grant execute on function public.worked_hours_by_site(timestamptz, timestamptz, uuid[]) to authenticated;
