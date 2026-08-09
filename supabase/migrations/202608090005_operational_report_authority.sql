-- Field reports get the same authority the timesheets got (#65, part 1).
--
-- `operational_reports` is the timesheet again: `status`, `submitted_at`,
-- `reviewed_by`, `reviewed_at`, `rejection_reason`, and `starts_at`, `ends_at`,
-- `break_minutes`. Same design, and — until now — the same hole, because the
-- only rule on writing was "you are a member of this company".
--
-- Verified against the database as João Ferreira, role `employee`:
--
--   approving his own report                     -> accepted
--   rewriting a colleague's report, +4 hours     -> accepted
--   rewriting the history trail, author included -> accepted
--
-- This was not a fifth coincidence. Every table created that day carries the
-- same policy; we had only found it where we happened to be working.
--
-- Also fixes something quieter. `operational_report_values` has no DELETE
-- policy at all, and the app's `replaceValues()` deletes before inserting — so
-- the delete silently matched nothing and the first real edit of a report would
-- have duplicated every field value. Zero duplicates exist today only because
-- all eight reports came from the seed and none has been edited.

/**
 * The general name for the role check.
 *
 * `can_review_timesheets` was the right question with the wrong scope: the same
 * five roles decide who reviews a field report. Kept as a thin alias so the
 * policies already using it do not have to be rewritten to find out.
 */
create or replace function private.is_company_manager(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_company_role(
    target_company_id,
    array['owner', 'admin', 'administrator', 'manager', 'supervisor']
  )
$$;

create or replace function private.can_review_timesheets(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.is_company_manager(target_company_id) $$;

/**
 * Whether the caller may still change this report's contents.
 *
 * One function because three policies and a trigger need the identical answer,
 * and three copies of a rule this shape is how they drift apart.
 */
create or replace function private.can_edit_operational_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.operational_reports r
    where r.id = p_report_id
      and r.status <> 'approved'
      and (
        private.is_company_manager(r.company_id)
        or (r.worker_id = (select auth.uid()) and r.status in ('draft', 'changes_requested'))
      )
  )
$$;

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
                      new.activity, new.notes, new.project_id, new.site_id,
                      new.template_id, new.team_id, new.client_company_id)
    is distinct from (old.report_date, old.starts_at, old.ends_at, old.break_minutes,
                      old.activity, old.notes, old.project_id, old.site_id,
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

drop trigger if exists enforce_operational_report on public.operational_reports;
create trigger enforce_operational_report
  before insert or update on public.operational_reports
  for each row execute function private.enforce_operational_report();

/**
 * The answers on the form follow the form.
 *
 * A value is part of the report, so "may I change this answer" has to be the
 * same question as "may I change this report". Leaving the values open would
 * move the whole hole one join sideways: the header stays approved and locked
 * while the content underneath it is rewritten.
 */
create or replace function private.enforce_report_value()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  target := coalesce(new.report_id, old.report_id);
  if not private.can_edit_operational_report(target) then
    raise exception 'This report can no longer be changed.'
      using errcode = 'insufficient_privilege';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists enforce_report_value on public.operational_report_values;
create trigger enforce_report_value
  before insert or update or delete on public.operational_report_values
  for each row execute function private.enforce_report_value();

-- The missing policy. Without it `replaceValues()` deletes nothing, silently,
-- and the next insert leaves two answers to the same question.
grant delete on public.operational_report_values to authenticated;
drop policy if exists operational_report_values_delete on public.operational_report_values;
create policy operational_report_values_delete on public.operational_report_values
  for delete to authenticated
  using ((select private.can_edit_operational_report(report_id)));

/**
 * The history is a record, not a field.
 *
 * It had an UPDATE policy, so a worker could rewrite what happened and who did
 * it. A trail the participants can edit is not a trail; it is a text box that
 * looks like evidence. Append-only from here, with the author stamped.
 */
drop policy if exists operational_report_history_tenant_update on public.operational_report_history;
revoke update on public.operational_report_history from authenticated;

create or replace function private.enforce_report_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  new.actor_id := (select auth.uid());
  new.occurred_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_report_history on public.operational_report_history;
create trigger enforce_report_history
  before insert on public.operational_report_history
  for each row execute function private.enforce_report_history();
