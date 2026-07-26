-- Harden privileged routines by keeping SECURITY DEFINER implementations out
-- of the exposed public schema. Public RPC entry points remain compatible and
-- execute as SECURITY INVOKER wrappers.

alter function public.create_company(text, text, text, text, text, text, text, text, text, text, text, text)
  set schema private;
alter function public.create_team(uuid, text, text, uuid, public.team_status, text, text, uuid[])
  set schema private;
alter function public.update_team(uuid, text, text, uuid, public.team_status, text, text)
  set schema private;
alter function public.handle_new_auth_user()
  set schema private;

revoke all on function private.create_company(text, text, text, text, text, text, text, text, text, text, text, text)
  from public, anon;
revoke all on function private.create_team(uuid, text, text, uuid, public.team_status, text, text, uuid[])
  from public, anon;
revoke all on function private.update_team(uuid, text, text, uuid, public.team_status, text, text)
  from public, anon;
revoke all on function private.handle_new_auth_user()
  from public, anon, authenticated;

grant execute on function private.create_company(text, text, text, text, text, text, text, text, text, text, text, text)
  to authenticated;
grant execute on function private.create_team(uuid, text, text, uuid, public.team_status, text, text, uuid[])
  to authenticated;
grant execute on function private.update_team(uuid, text, text, uuid, public.team_status, text, text)
  to authenticated;

create function public.create_company(
  legal_name_input text,
  display_name_input text,
  country_code_input text,
  default_language_input text,
  timezone_input text,
  currency_code_input text,
  registration_number_input text default null,
  vat_number_input text default null,
  email_input text default null,
  phone_input text default null,
  city_input text default null,
  website_input text default null
) returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_company(
    legal_name_input, display_name_input, country_code_input,
    default_language_input, timezone_input, currency_code_input,
    registration_number_input, vat_number_input, email_input,
    phone_input, city_input, website_input
  );
$$;

create function public.create_team(
  company_id_input uuid,
  name_input text,
  description_input text,
  leader_membership_id_input uuid default null,
  status_input public.team_status default 'active',
  color_input text default null,
  icon_input text default null,
  member_ids_input uuid[] default '{}'
) returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_team(
    company_id_input, name_input, description_input,
    leader_membership_id_input, status_input, color_input,
    icon_input, member_ids_input
  );
$$;

create function public.update_team(
  team_id_input uuid,
  name_input text,
  description_input text,
  leader_membership_id_input uuid,
  status_input public.team_status,
  color_input text,
  icon_input text
) returns void
language sql
security invoker
set search_path = ''
as $$
  select private.update_team(
    team_id_input, name_input, description_input,
    leader_membership_id_input, status_input, color_input, icon_input
  );
$$;

revoke all on function public.create_company(text, text, text, text, text, text, text, text, text, text, text, text)
  from public, anon;
revoke all on function public.create_team(uuid, text, text, uuid, public.team_status, text, text, uuid[])
  from public, anon;
revoke all on function public.update_team(uuid, text, text, uuid, public.team_status, text, text)
  from public, anon;
grant execute on function public.create_company(text, text, text, text, text, text, text, text, text, text, text, text)
  to authenticated;
grant execute on function public.create_team(uuid, text, text, uuid, public.team_status, text, text, uuid[])
  to authenticated;
grant execute on function public.update_team(uuid, text, text, uuid, public.team_status, text, text)
  to authenticated;

-- Keep the limited company lookup available without making the full companies
-- table public or allowing a view to bypass RLS implicitly.
drop view public.company_directory;
create function private.company_directory_rows()
returns table(id uuid, name text, vat_number text)
language sql
stable
security definer
set search_path = ''
as $$
  select companies.id, companies.name, companies.vat_number
  from public.companies
  where companies.status <> 'archived';
$$;
revoke all on function private.company_directory_rows() from public, anon;
grant execute on function private.company_directory_rows() to authenticated;

create view public.company_directory
with (security_invoker = true)
as select * from private.company_directory_rows();
grant select on table public.company_directory to authenticated;

-- Consolidate overlapping permissive policies while preserving the exact
-- union of their existing access predicates.
drop policy if exists memberships_read_own on public.company_memberships;
drop policy if exists memberships_company_read on public.company_memberships;
create policy memberships_read on public.company_memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_company_member(company_id))
  );

drop policy if exists users_read_self on public.users;
drop policy if exists users_shared_company_read on public.users;
create policy users_read on public.users
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.company_memberships mine
      join public.company_memberships theirs
        on theirs.company_id = mine.company_id
      where mine.user_id = (select auth.uid())
        and mine.status = 'active'
        and theirs.user_id = users.id
        and theirs.status in ('active', 'invited')
    )
  );

drop policy if exists company_relationships_member_read on public.company_relationships;
drop policy if exists company_relationships_read on public.company_relationships;
create policy company_relationships_read on public.company_relationships
  for select to authenticated
  using (
    (select private.is_company_member(source_company_id))
    or (select private.is_company_member(target_company_id))
  );

drop policy if exists company_relationships_source_manage on public.company_relationships;
drop policy if exists company_relationships_request on public.company_relationships;
create policy company_relationships_insert on public.company_relationships
  for insert to authenticated
  with check (
    (select private.has_company_role(
      source_company_id,
      array['owner', 'admin', 'administrator', 'manager']
    ))
  );

drop policy if exists company_relationships_source_update on public.company_relationships;
drop policy if exists company_relationships_respond on public.company_relationships;
create policy company_relationships_update on public.company_relationships
  for update to authenticated
  using (
    (select private.has_company_role(
      source_company_id,
      array['owner', 'admin', 'administrator', 'manager']
    ))
    or (select private.has_company_role(
      target_company_id,
      array['owner', 'admin', 'administrator']
    ))
  )
  with check (
    (select private.has_company_role(
      source_company_id,
      array['owner', 'admin', 'administrator', 'manager']
    ))
    or (select private.has_company_role(
      target_company_id,
      array['owner', 'admin', 'administrator']
    ))
  );

drop policy if exists localization_settings_user_manage on public.localization_settings;
drop policy if exists localization_settings_company_manage on public.localization_settings;
create policy localization_settings_insert on public.localization_settings
  for insert to authenticated
  with check (
    (user_id = (select auth.uid()) and company_id is null)
    or (
      company_id is not null
      and (select private.has_company_role(
        company_id,
        array['owner', 'admin', 'administrator']
      ))
    )
  );

drop policy if exists localization_settings_user_update on public.localization_settings;
drop policy if exists localization_settings_company_update on public.localization_settings;
create policy localization_settings_update on public.localization_settings
  for update to authenticated
  using (
    (user_id = (select auth.uid()) and company_id is null)
    or (
      company_id is not null
      and (select private.has_company_role(
        company_id,
        array['owner', 'admin', 'administrator']
      ))
    )
  )
  with check (
    (user_id = (select auth.uid()) and company_id is null)
    or (
      company_id is not null
      and (select private.has_company_role(
        company_id,
        array['owner', 'admin', 'administrator']
      ))
    )
  );

-- Cover every foreign-key lookup currently reported by the database advisor.
create index if not exists audit_logs_actor_id_idx on public.audit_logs(actor_id);
create index if not exists certificates_user_id_idx on public.certificates(user_id);
create index if not exists company_memberships_invited_by_idx on public.company_memberships(invited_by);
create index if not exists company_memberships_pending_team_id_idx on public.company_memberships(pending_team_id);
create index if not exists company_relationships_source_company_id_idx on public.company_relationships(source_company_id);
create index if not exists company_relationships_target_company_id_idx on public.company_relationships(target_company_id);
create index if not exists employee_records_manager_membership_id_idx on public.employee_records(manager_membership_id);
create index if not exists localization_settings_company_id_idx on public.localization_settings(company_id);
create index if not exists localization_settings_user_id_idx on public.localization_settings(user_id);
create index if not exists membership_roles_role_id_idx on public.membership_roles(role_id);
create index if not exists notifications_company_id_idx on public.notifications(company_id);
create index if not exists operational_report_history_actor_id_idx on public.operational_report_history(actor_id);
create index if not exists operational_report_history_company_id_idx on public.operational_report_history(company_id);
create index if not exists operational_report_values_company_id_idx on public.operational_report_values(company_id);
create index if not exists operational_report_values_field_id_idx on public.operational_report_values(field_id);
create index if not exists operational_reports_client_company_id_idx on public.operational_reports(client_company_id);
create index if not exists operational_reports_created_by_idx on public.operational_reports(created_by);
create index if not exists operational_reports_project_id_idx on public.operational_reports(project_id);
create index if not exists operational_reports_reviewed_by_idx on public.operational_reports(reviewed_by);
create index if not exists operational_reports_team_id_idx on public.operational_reports(team_id);
create index if not exists operational_reports_template_id_idx on public.operational_reports(template_id);
create index if not exists operational_reports_worker_id_idx on public.operational_reports(worker_id);
create index if not exists payroll_consolidation_classifications_classification_id_idx on public.payroll_consolidation_classifications(classification_id);
create index if not exists payroll_consolidation_classifications_company_id_idx on public.payroll_consolidation_classifications(company_id);
create index if not exists payroll_consolidations_company_id_idx on public.payroll_consolidations(company_id);
create index if not exists payroll_period_history_actor_id_idx on public.payroll_period_history(actor_id);
create index if not exists payroll_period_history_company_id_idx on public.payroll_period_history(company_id);
create index if not exists payroll_periods_closed_by_idx on public.payroll_periods(closed_by);
create index if not exists project_memberships_company_membership_id_idx on public.project_memberships(company_membership_id);
create index if not exists projects_client_company_id_idx on public.projects(client_company_id);
create index if not exists projects_manager_id_idx on public.projects(manager_id);
create index if not exists report_template_fields_company_id_idx on public.report_template_fields(company_id);
create index if not exists reports_requested_by_idx on public.reports(requested_by);
create index if not exists role_permissions_permission_id_idx on public.role_permissions(permission_id);
create index if not exists sites_client_company_id_idx on public.sites(client_company_id);
create index if not exists sites_manager_id_idx on public.sites(manager_id);
create index if not exists sites_project_id_idx on public.sites(project_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists team_memberships_company_membership_id_idx on public.team_memberships(company_membership_id);
create index if not exists teams_leader_membership_id_idx on public.teams(leader_membership_id);
create index if not exists timesheet_entries_project_id_idx on public.timesheet_entries(project_id);
create index if not exists timesheet_entries_site_id_idx on public.timesheet_entries(site_id);
create index if not exists timesheet_entries_task_id_idx on public.timesheet_entries(task_id);
create index if not exists timesheet_entries_timesheet_id_idx on public.timesheet_entries(timesheet_id);
create index if not exists timesheets_reviewed_by_idx on public.timesheets(reviewed_by);
create index if not exists timesheets_user_id_idx on public.timesheets(user_id);
create index if not exists user_settings_default_company_id_idx on public.user_settings(default_company_id);
