-- Was the clock-in made at the work location? (#31, #61)
--
-- The company needs to know that a shift was started where the work is. It does
-- not need to know where its people are, and the instruction on that has not
-- changed: address and location, never a trail of coordinates.
--
-- Those two are only in tension if you store the position. So the browser reads
-- it at the moment the button is pressed, the server compares it against the
-- work location's own coordinates, and what is kept is the answer:
--
--   started_within_site   yes / no / unknown
--   start_distance_m      how far off, rounded to 10 m
--
-- The position itself is never written down. There is nothing in this schema
-- that says where a person was at a given time — only whether they were at the
-- place the work is, which is the question the company actually has.
--
-- Rounded to ten metres deliberately. A metre-accurate distance from a known
-- point is a position again, by arithmetic. Ten metres answers "at the site or
-- not" and answers nothing else.

alter table public.time_sessions
  add column if not exists started_within_site boolean,
  add column if not exists start_distance_m integer;

comment on column public.time_sessions.started_within_site is
  'Whether the clock-in happened at the work location. Null when the location has no coordinates, or the device would not say. The position itself is deliberately not stored.';

comment on column public.time_sessions.start_distance_m is
  'Distance from the work location at clock-in, rounded to 10 m. Coarse on purpose: an exact distance from a known point reconstructs the position.';

/**
 * The verdict is the server's to write, not the caller's.
 *
 * Left writable, a phone could simply claim it was at the site — which would
 * make the whole check decoration. The action computes both values from the
 * position it was given and the location it is checking against; an update
 * from an end user may not change them afterwards.
 */
create or replace function private.enforce_time_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_manager boolean;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.started_at := now();
    new.ended_at := null;
    new.confirmed_at := null;
    new.timesheet_entry_id := null;
    return new;
  end if;

  if new.started_at is distinct from old.started_at then
    raise exception 'A session start time cannot be changed.'
      using errcode = 'insufficient_privilege';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'A session cannot be moved to another person.'
      using errcode = 'insufficient_privilege';
  end if;

  -- Where the shift started is settled when it starts. Reopening that later
  -- would let a disputed clock-in be quietly re-answered.
  if new.started_within_site is distinct from old.started_within_site
     or new.start_distance_m is distinct from old.start_distance_m then
    is_manager := private.is_company_manager(new.company_id);
    if not is_manager then
      raise exception 'The location check cannot be changed.'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
    raise exception 'This session is already closed.'
      using errcode = 'check_violation';
  end if;

  if new.ended_at is not null and old.ended_at is null
     and new.ended_at > clock_timestamp() + interval '1 minute' then
    raise exception 'A session cannot end in the future.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
