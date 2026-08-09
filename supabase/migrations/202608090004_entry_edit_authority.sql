-- Approved hours stop moving (#56).
--
-- The trigger added in #57 policed `timesheet_entries.status` and nothing else,
-- which turns out to guard the label on the box rather than what is inside it.
-- Verified against the database as João Ferreira, role `employee`:
--
--   update timesheet_entries set ends_at = ends_at + interval '3 hours'
--     where id = <his own, already approved>;
--   -> 540 minutes became 720
--
--   the same statement against a colleague's approved entry -> also accepted
--
-- So approval meant nothing. A week could be signed off and then quietly grow,
-- and the report — which reads these rows — would show the new number with no
-- indication that anything had changed after the decision.
--
-- The rule this installs:
--
--   * an approved entry is immutable, for everyone
--   * you may edit your own entry while it is a draft or was rejected
--   * a manager may edit anything not yet approved, which is the whole point of
--     reviewing before approving
--   * nobody moves an entry to another timesheet or another company
--
-- Changing approved hours is still possible, but only the long way: a manager
-- reopens the timesheet (approved -> draft), which the review trigger already
-- allows and records. That is a deliberate act with a name on it, rather than
-- an update nobody sees.

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

  content_changed := (new.starts_at, new.ends_at, new.break_minutes, new.project_id, new.task_id, new.site_id, new.notes)
    is distinct from (old.starts_at, old.ends_at, old.break_minutes, old.project_id, old.task_id, old.site_id, old.notes);

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
