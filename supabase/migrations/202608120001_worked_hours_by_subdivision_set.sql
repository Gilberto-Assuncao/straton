-- The per-subdivision breakdown takes a set of locations too (#77)
--
-- `worked_hours_by_subdivision` was written for one location, because its only
-- caller was one location's page. The company report needs the same breakdown
-- over whatever the manager picked — all of them, some, or one — and that is
-- the shape #81 already settled for `worked_hours_by_site`:
--
--   "one is just an array of length one, and building the single case first is
--    how a screen ends up with a selector that cannot express 'these three'"
--
-- So the single-location version is not kept alongside. It is replaced, and the
-- location page passes an array of one.
--
-- Dropped and recreated rather than overloaded, for the reason that migration
-- wrote down: a defaulted parameter added to a function that already exists
-- leaves both callable, and a call that matches both is refused by Postgres as
-- ambiguous — at call time, which means a report that breaks at month end.

drop function if exists public.worked_hours_by_subdivision(uuid, timestamptz, timestamptz);

/**
 * Worked minutes per subdivision, across a chosen set of work locations.
 *
 * The location comes back on every row, which it did not have to when the
 * function answered about one. "1er étage" is a name two chantiers can both
 * have, and a report that listed it twice with different numbers and no way to
 * tell them apart would be worse than no breakdown at all.
 *
 * `security invoker`, like both of its neighbours, so the caller's own RLS
 * decides which entries exist and naming another company's location returns
 * nothing rather than their hours. The filter narrows; it never widens.
 *
 * The unattributed row is kept, with a null subdivision: hours booked before a
 * location was divided, or by somebody on the quick-clock page who was never
 * asked which floor. Dropping them would make the subdivisions add up to less
 * than their location's total with nothing to explain the difference.
 */
create or replace function public.worked_hours_by_subdivision(
  p_from timestamptz,
  p_to timestamptz,
  p_site_ids uuid[] default null
)
returns table (
  site_id uuid,
  site_name text,
  site_area_id uuid,
  area_name text,
  is_default boolean,
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
    a.id,
    a.name,
    coalesce(a.is_default, false),
    -- greatest(0, ...) because a break longer than the shift would otherwise
    -- subtract into negative minutes and quietly reduce another row's total
    -- once these are summed.
    coalesce(sum(case when e.status = 'approved' then greatest(0,
      (extract(epoch from (e.ends_at - e.starts_at)) / 60)::int - e.break_minutes) end), 0)::bigint,
    coalesce(sum(case when e.status <> 'approved' then greatest(0,
      (extract(epoch from (e.ends_at - e.starts_at)) / 60)::int - e.break_minutes) end), 0)::bigint,
    count(distinct t.user_id)::bigint
  from public.timesheet_entries e
  join public.timesheets t on t.id = e.timesheet_id
  -- Inner join on the location, unlike `worked_hours_by_site`. That function
  -- left-joins so hours booked against no chantier are reported as an honest
  -- gap; here there is nothing to report them under, because a subdivision of
  -- no location does not exist. Those hours are already visible on the
  -- locations table of the same report.
  join public.sites s on s.id = e.site_id
  left join public.site_areas a on a.id = e.site_area_id
  where e.starts_at >= p_from
    and e.starts_at < p_to
    -- An empty array means the same as no array. A multi-select that has been
    -- cleared should show everything, not an empty report the manager reads as
    -- "nobody worked".
    and (p_site_ids is null or cardinality(p_site_ids) = 0 or e.site_id = any(p_site_ids))
  group by s.id, s.name, a.id, a.name, a.is_default
  order by s.name, 6 desc, a.name nulls last
$$;

revoke all on function public.worked_hours_by_subdivision(timestamptz, timestamptz, uuid[]) from public;
grant execute on function public.worked_hours_by_subdivision(timestamptz, timestamptz, uuid[]) to authenticated;
