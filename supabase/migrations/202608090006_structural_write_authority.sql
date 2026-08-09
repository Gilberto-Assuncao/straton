-- Who may change the company's structure (#65, part 2).
--
-- The eight tables left over from the sweep: the ones that hold no hours, so
-- they were not urgent, only wrong. Every one of them said the same thing —
-- "you are a member of this company" — for insert and update alike.
--
-- Verified against the database as João Ferreira, role `employee`:
--
--   creating a project out of nothing                       -> accepted
--   renaming the fields of the report everyone fills in     -> accepted
--   setting his own project role to `manager`, every project -> accepted
--
-- The third is privilege escalation rather than vandalism, and it is the reason
-- this half was not merely tidying.
--
-- A separate helper from `is_company_manager` on purpose. Reviewing hours and
-- changing what a company *is* are different powers, and the app already drew
-- that line: sites and report templates check owner/admin/administrator/manager
-- and deliberately leave out `supervisor`. A supervisor signs off a week; they
-- do not rename the sites.

create or replace function private.is_company_admin(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_company_role(
    target_company_id,
    array['owner', 'admin', 'administrator', 'manager']
  )
$$;

/**
 * The structural tables, in one pass.
 *
 * Written as a loop for the same reason the original policies were: five tables
 * with an identical rule, and five hand-written copies is how one of them ends
 * up subtly different a year from now. Reading stays open to the whole company
 * — a worker has to see the sites and tasks to log time against them.
 */
do $$
declare
  target text;
begin
  foreach target in array array['projects', 'sites', 'tasks', 'report_templates', 'report_template_fields']
  loop
    execute format('drop policy if exists %I on public.%I', target || '_tenant_insert', target);
    execute format('drop policy if exists %I on public.%I', target || '_tenant_update', target);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select private.is_company_admin(company_id)))',
      target || '_admin_insert', target);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select private.is_company_admin(company_id)))
         with check ((select private.is_company_admin(company_id)))',
      target || '_admin_update', target);
  end loop;
end $$;

-- The missing policy, and the same silent failure as the report values in part
-- one: `template-actions.ts` deletes a field, the delete matches no rows, and
-- the screen reports success. Confirmed by deleting one as an admin and finding
-- it still there.
grant delete on public.report_template_fields to authenticated;
drop policy if exists report_template_fields_admin_delete on public.report_template_fields;
create policy report_template_fields_admin_delete on public.report_template_fields
  for delete to authenticated
  using ((select private.is_company_admin(company_id)));

/**
 * A field with answers behind it cannot be deleted.
 *
 * `operational_report_values.field_id` cascades, so deleting a template field
 * would take the recorded answers with it — including answers on reports that
 * have been approved and signed off. The delete policy added above made that
 * possible for the first time, so this is the rule that has to arrive with it.
 *
 * The part-one trigger on the values already blocked it, but by accident and
 * with the wrong words: an admin removing a field was told "this report can no
 * longer be changed", which is true of a report they were not thinking about.
 * The app already offers deactivation, which keeps the history and hides the
 * field from new reports; this points at it.
 *
 * A trigger rather than switching the foreign key to `restrict`, which would
 * enforce the same thing — because the message is the point. A constraint
 * violation tells someone the operation failed; this tells them what to do
 * instead.
 */
create or replace function private.protect_answered_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return old;
  end if;

  if exists (select 1 from public.operational_report_values v where v.field_id = old.id) then
    raise exception 'This field has answers on existing reports. Deactivate it instead of deleting it.'
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_answered_fields on public.report_template_fields;
create trigger protect_answered_fields
  before delete on public.report_template_fields
  for each row execute function private.protect_answered_fields();

-- Who is on which project, and in what role. Left open, this is how a worker
-- makes themselves a project manager.
drop policy if exists project_memberships_tenant_update on public.project_memberships;
create policy project_memberships_admin_update on public.project_memberships
  for update to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

/**
 * Export requests belong to whoever asked for them.
 *
 * Nothing writes this table yet. Anyone may ask for their own export; the
 * status and the file URL are filled in by whatever produces it, which is not
 * the browser.
 */
drop policy if exists reports_tenant_insert on public.reports;
drop policy if exists reports_tenant_update on public.reports;
create policy reports_own_insert on public.reports
  for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and (select private.is_company_member(company_id))
  );
create policy reports_admin_update on public.reports
  for update to authenticated
  using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

/**
 * The audit log stops being writable from a browser at all.
 *
 * It accepted invented lines from any employee and allowed them to be edited
 * afterwards, which is worse than having no audit log: it lends the authority
 * of a record to something anyone could author. No application code writes it —
 * zero rows today — so nothing loses a capability it was using. When something
 * does need to write here, it should be a `security definer` function that
 * decides what it records, not a table anyone can post to.
 *
 * Reading narrows to the people who would act on it. A trail of who did what is
 * not general staff-room material.
 */
drop policy if exists audit_logs_tenant_insert on public.audit_logs;
drop policy if exists audit_logs_tenant_update on public.audit_logs;
drop policy if exists audit_logs_tenant_read on public.audit_logs;
revoke insert, update on public.audit_logs from authenticated;

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using ((select private.is_company_admin(company_id)));
