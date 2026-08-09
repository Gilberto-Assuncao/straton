-- Who is allowed to approve hours.
--
-- The RLS on `timesheets` said only "you are a member of this company", for
-- select, insert and update alike. The manager check lived in the server action
-- and nowhere else — so it protected the button, not the table. PostgREST is
-- reachable with the publishable key, which means any authenticated worker
-- could write the row directly.
--
-- Both halves were verified against the database before this was written, as
-- João Ferreira (role `employee`):
--
--   update public.timesheets set status = 'approved' where id = '…';
--   -> approved
--
--   insert into public.timesheets (…, status) values (…, 'approved');
--   insert into public.timesheet_entries (…, status) values (…, 'approved');
--   -> twenty-three pre-approved hours, invented, counted by the report
--
-- Approved hours are the ones the worked-hours report counts and the ones that
-- reach payroll. This is not a permissions detail; it is the whole control on
-- what a company pays out.
--
-- Triggers rather than `with check`, because the rule is about the *transition*
-- and a `with check` only ever sees the new row: it cannot tell a draft being
-- sent for approval apart from an approval, since both end in a status it would
-- have to permit. And triggers on insert as well as update, because guarding
-- only the transition leaves the far cheaper attack of being born approved.

create or replace function private.can_review_timesheets(target_company_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.has_company_role(
    target_company_id,
    array['owner', 'admin', 'administrator', 'manager', 'supervisor']
  )
$$;

create or replace function private.enforce_timesheet_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_manager boolean;
begin
  -- No JWT, no end user: this is a migration, `seed-demo.sql`, or a
  -- maintenance task, and there are no roles to check. Without the escape the
  -- seed could not create an approved week and the demo dataset would not load.
  --
  -- Not a hole. Anonymous requests also have no `auth.uid()`, but they cannot
  -- reach these rows at all — every policy on them starts by asking whether the
  -- caller is a member of the company.
  if (select auth.uid()) is null then
    return new;
  end if;

  is_manager := private.can_review_timesheets(new.company_id);

  -- A new timesheet starts as a draft belonging to whoever is filling it in.
  -- Anything else on insert is someone skipping the queue.
  if tg_op = 'INSERT' then
    if new.status <> 'draft' and not is_manager then
      raise exception 'A new timesheet starts as a draft.'
        using errcode = 'insufficient_privilege';
    end if;
    if new.user_id <> (select auth.uid()) and not is_manager then
      raise exception 'You can only create your own timesheet.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  -- Status untouched: an ordinary edit, not a review. Nothing to police.
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- The worker sending their own week in, or taking a rejected week back.
  if new.status = 'submitted' then
    if old.status not in ('draft', 'rejected') then
      raise exception 'A timesheet can only be submitted from draft or rejected.'
        using errcode = 'check_violation';
    end if;
    if new.user_id <> (select auth.uid()) and not is_manager then
      raise exception 'You can only submit your own timesheet.'
        using errcode = 'insufficient_privilege';
    end if;
    return new;
  end if;

  -- Everything past this point is a review decision.
  if not is_manager then
    raise exception 'Only a manager can review a timesheet.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.status in ('approved', 'rejected') then
    if old.status <> 'submitted' then
      raise exception 'Only a submitted timesheet can be reviewed.'
        using errcode = 'check_violation';
    end if;

    -- No reviewing your own hours — unless you are the owner, who in a small
    -- Belgian firm is often the only person on the account. Refusing there
    -- would leave the owner's own hours permanently unapprovable, and hours
    -- that can never be approved never reach the report at all. That is worse
    -- than the thing the rule guards against.
    if new.user_id = (select auth.uid())
       and not private.has_company_role(new.company_id, array['owner']) then
      raise exception 'You cannot approve your own timesheet.'
        using errcode = 'insufficient_privilege';
    end if;

    -- Stamped here, not trusted from the caller. Otherwise the audit trail
    -- records whoever the request said it was.
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_timesheet_review on public.timesheets;
create trigger enforce_timesheet_review
  before insert or update on public.timesheets
  for each row execute function private.enforce_timesheet_review();

/**
 * The same rule one table down.
 *
 * `timesheet_entries.status` is what the report actually aggregates. Locking
 * the sheet while leaving the entries writable would move the self-approval one
 * join away rather than removing it.
 */
create or replace function private.enforce_entry_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if new.status in ('approved', 'rejected')
     and not private.can_review_timesheets(new.company_id) then
    raise exception 'Only a manager can approve or reject time entries.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_entry_review on public.timesheet_entries;
create trigger enforce_entry_review
  before insert or update on public.timesheet_entries
  for each row execute function private.enforce_entry_review();
