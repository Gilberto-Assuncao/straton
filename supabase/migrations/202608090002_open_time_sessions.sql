-- A clock-in that survives the phone being locked (#60).
--
-- The running timer lived entirely in React state: `timerState`, `startedAtIso`
-- and a seconds counter, with nothing written anywhere until Stop was pressed.
-- So the day existed only inside one open browser tab. Lock the screen and let
-- iOS discard the tab, take a call, reload without thinking, run out of battery
-- at four in the afternoon — the eight hours never happened. No error, no
-- warning, just no record.
--
-- The fix is to write the row at Start and close it at Stop. A row is also what
-- makes "who is working right now" answerable at all, which is the question
-- behind the live operations map (#5).

create table public.time_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.users(id),
  project_id uuid references public.projects(id),
  task_id uuid references public.tasks(id),
  site_id uuid references public.sites(id),
  notes text,
  -- Stamped by the database, never by the caller. A start time the client can
  -- choose is a start time the client can backdate, and this row becomes paid
  -- hours the moment it closes.
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  -- The entry this session produced, so a closed session can be traced to the
  -- hours it became rather than being a parallel account of the same work.
  timesheet_entry_id uuid references public.timesheet_entries(id) on delete set null,
  -- Set when the person confirms a session that ran suspiciously long, so the
  -- confirmation is recorded rather than inferred from the numbers.
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at)
);

/**
 * One clock at a time.
 *
 * Two open sessions for the same person means two overlapping claims on the
 * same hour, and whichever closes second silently wins. A partial unique index
 * makes that unrepresentable instead of something the app has to remember.
 */
create unique index time_sessions_one_open_per_user
  on public.time_sessions (company_id, user_id)
  where ended_at is null;

create index time_sessions_open on public.time_sessions (company_id) where ended_at is null;
create index time_sessions_user_recent on public.time_sessions (user_id, started_at desc);

alter table public.time_sessions enable row level security;

grant select, insert, update on public.time_sessions to authenticated;

/**
 * Your own sessions, and — for whoever reviews the hours — the company's.
 *
 * A supervisor needs to see who is clocked in; that is the entire point of a
 * live view. A colleague does not, so this is not simply "company member".
 */
create policy time_sessions_read on public.time_sessions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.can_review_timesheets(company_id))
  );

create policy time_sessions_insert on public.time_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_company_member(company_id)));

-- Update, not delete: a clock-in that can be deleted is a clock-in that can be
-- denied. Closing a session is an update; there is no policy for removing one.
create policy time_sessions_update on public.time_sessions
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.can_review_timesheets(company_id))
  )
  with check (
    user_id = (select auth.uid())
    or (select private.can_review_timesheets(company_id))
  );

/**
 * What a caller may not decide for themselves.
 *
 * `started_at` is the money field. Left writable it can be set to three in the
 * morning on insert, or quietly moved backwards on update after the fact, and
 * either turns into hours somebody pays for.
 */
create or replace function private.enforce_time_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- No JWT: a migration or the seed. Same escape as the timesheet triggers, and
  -- for the same reason — demo history has to be able to start in the past.
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

  -- Closing is a one-way door. Reopening a closed session would detach it from
  -- the timesheet entry it already produced, leaving the hours counted twice.
  if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
    raise exception 'This session is already closed.'
      using errcode = 'check_violation';
  end if;

  -- The end may be corrected downwards but never invented forwards.
  --
  -- Someone who forgot to stop needs to be able to say "I actually finished at
  -- five", and stamping `now()` here would take that away and leave them with
  -- fourteen hours they cannot fix. Moving the end earlier only ever removes
  -- hours, so there is nothing to defend against; a time in the future is the
  -- only direction that pays.
  -- `clock_timestamp()`, not `now()`: `now()` is the transaction start, and a
  -- request that stamps its end a few milliseconds later would be refused for
  -- being "in the future". The minute of slack covers ordinary clock skew
  -- without leaving room to invent an afternoon.
  if new.ended_at is not null and old.ended_at is null
     and new.ended_at > clock_timestamp() + interval '1 minute' then
    raise exception 'A session cannot end in the future.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger enforce_time_session
  before insert or update on public.time_sessions
  for each row execute function private.enforce_time_session();
