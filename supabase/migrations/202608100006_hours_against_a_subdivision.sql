-- Hours are recorded against a subdivision (#77)
--
-- `site_areas` has existed since 202608100002 and nothing has ever written a
-- reference to one. The promise made there — "the report always has something
-- to group by, because there is always exactly one" — is only true once the
-- hours point at it. Until this migration the table was structure with no
-- traffic: a manager could divide a location into floors and every hour worked
-- on them still landed in one undifferentiated pile.

alter table public.timesheet_entries
  -- `restrict` rather than `set null` or `cascade`. Deleting a subdivision that
  -- has hours against it must fail loudly: `set null` would quietly detach paid
  -- work from the place it happened, and this project has already found four
  -- deletes that reported success while doing nothing.
  add column if not exists site_area_id uuid references public.site_areas(id) on delete restrict;

alter table public.time_sessions
  add column if not exists site_area_id uuid references public.site_areas(id) on delete restrict;

create index if not exists timesheet_entries_site_area_idx
  on public.timesheet_entries (site_area_id) where site_area_id is not null;

comment on column public.timesheet_entries.site_area_id is
  'Which subdivision of the work location these hours belong to (#77). Filled in automatically when the location has only one, so an undivided location needs nobody to answer a question with one possible answer.';

/**
 * Keeps a subdivision and a location from disagreeing, and answers the
 * question when there is only one possible answer.
 *
 * Two jobs, and they are the same rule seen from both ends.
 *
 * *Refusing the mismatch* is the security-shaped half. `site_area_id` arrives
 * from the caller, and a policy that only checks `company_id` would happily
 * accept a subdivision of a different location — attributing your hours to
 * somebody else's floor. The check belongs on the server or it is not a check;
 * the same reasoning as `enforce_site_area` two migrations ago.
 *
 * *Filling in the blank* is what makes the feature exist at all. A single-family
 * house is one location with one subdivision, and asking the person on the roof
 * to choose between one option is the kind of required field that has become a
 * dead end here three times. So: exactly one subdivision, and it is filled in.
 *
 * More than one, and nothing chosen, stays null. Deliberately. Guessing would
 * attribute the day to a floor they may not have been on, and the report is
 * built to show unattributed hours as an honest gap rather than fold them into
 * a number that looks complete — the same choice as the left join in
 * `worked_hours_by_site`.
 */
create or replace function private.enforce_entry_subdivision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  area_site uuid;
  area_count integer;
  only_area uuid;
begin
  if new.site_area_id is not null then
    select s.site_id into area_site from public.site_areas s where s.id = new.site_area_id;

    if area_site is null then
      raise exception 'That subdivision does not exist.' using errcode = 'foreign_key_violation';
    end if;

    -- Covers both the mismatch and the entry that names a subdivision while
    -- claiming no location at all, which is the same contradiction written
    -- with a null.
    if new.site_id is distinct from area_site then
      raise exception 'That subdivision belongs to a different work location.'
        using errcode = 'check_violation';
    end if;

    return new;
  end if;

  if new.site_id is not null then
    select count(*) into area_count from public.site_areas a where a.site_id = new.site_id;
    if area_count = 1 then
      select a.id into only_area from public.site_areas a where a.site_id = new.site_id;
      new.site_area_id := only_area;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_entry_subdivision on public.timesheet_entries;
create trigger enforce_entry_subdivision
  before insert or update of site_id, site_area_id on public.timesheet_entries
  for each row execute function private.enforce_entry_subdivision();

drop trigger if exists enforce_session_subdivision on public.time_sessions;
create trigger enforce_session_subdivision
  before insert or update of site_id, site_area_id on public.time_sessions
  for each row execute function private.enforce_entry_subdivision();

-- The hours already recorded, given the same treatment as the ones recorded
-- from now on. Without this, every entry predating today reads as unattributed
-- and the per-subdivision totals would describe only the last few days —
-- a report that is empty for a reason nobody on screen could work out.
update public.timesheet_entries e
set site_area_id = (select a.id from public.site_areas a where a.site_id = e.site_id)
where e.site_id is not null
  and e.site_area_id is null
  and (select count(*) from public.site_areas a where a.site_id = e.site_id) = 1;

/**
 * Worked minutes per subdivision of one location.
 *
 * A separate function rather than more columns on `worked_hours_by_site`: that
 * one answers "how much did each location cost", and this one breaks a single
 * location open. Joining them would make a report that is already a set of
 * locations return a row per subdivision of each, which is a different question
 * nobody asked.
 *
 * `security invoker`, like both of its neighbours, so the caller's own RLS
 * decides which entries exist at all and naming another company's location
 * returns nothing rather than their hours.
 *
 * The unattributed row is kept, with a null id: hours booked to the location
 * before it was divided, or by somebody who did not say which floor. Dropping
 * them would make the subdivisions add up to less than the location's total
 * with nothing to explain the difference.
 */
create or replace function public.worked_hours_by_subdivision(
  p_site_id uuid,
  p_from timestamptz default '2000-01-01T00:00:00Z',
  p_to timestamptz default '2100-01-01T00:00:00Z'
)
returns table (
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
  left join public.site_areas a on a.id = e.site_area_id
  where e.site_id = p_site_id
    and e.starts_at >= p_from
    and e.starts_at < p_to
  group by a.id, a.name, a.is_default
  order by 4 desc, a.name nulls last
$$;

revoke all on function public.worked_hours_by_subdivision(uuid, timestamptz, timestamptz) from public;
grant execute on function public.worked_hours_by_subdivision(uuid, timestamptz, timestamptz) to authenticated;
