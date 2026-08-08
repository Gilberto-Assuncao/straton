-- Worked hours per person, for a period.
--
-- The report a company actually needs at month end: how many hours each person
-- worked, in a form that can go to the accountant.
--
-- Aggregated in SQL rather than in the app for two reasons. A year of entries
-- for a real company is thousands of rows that nobody needs to send over the
-- wire to be summed. And the minute arithmetic — end minus start minus break,
-- floored at zero — then lives in exactly one place instead of being
-- reimplemented next to every consumer, which is how two screens end up
-- disagreeing about the same week.
--
-- `security invoker` on purpose: the caller's own RLS decides which rows they
-- can see, so this cannot become a way to read another company's hours.

/**
 * Split by status, never merged into one total.
 *
 * `approved` is what payroll may act on. `submitted` is waiting for someone.
 * `draft` is the worker's own unfinished record. A single number covering all
 * three answers "how much work happened" while looking exactly like the answer
 * to "what do we pay" — and that number reaching a payroll office is the
 * mistake this shape exists to prevent.
 */
create or replace function public.worked_hours_by_person(
  p_from timestamptz,
  p_to timestamptz
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
  p_to timestamptz
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
  join public.sites s on s.id = e.site_id
  left join public.projects p on p.id = s.project_id
  where e.starts_at >= p_from
    and e.starts_at < p_to
  group by s.id, s.name, p.name
  order by 4 desc, s.name
$$;

revoke all on function public.worked_hours_by_person(timestamptz, timestamptz) from public;
revoke all on function public.worked_hours_by_site(timestamptz, timestamptz) from public;
grant execute on function public.worked_hours_by_person(timestamptz, timestamptz) to authenticated;
grant execute on function public.worked_hours_by_site(timestamptz, timestamptz) to authenticated;
