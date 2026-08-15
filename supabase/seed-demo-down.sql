-- ============================================================================
-- STRATON — Demo dataset teardown
-- ----------------------------------------------------------------------------
-- Removes everything created by `seed-demo.sql` and nothing else.
--
-- Safety model: every demo row carries a `d000000x-` UUID prefix, and every
-- demo auth account lives under a `*.straton.demo` domain. This script only
-- ever matches on those two markers, so it cannot touch real data even if it
-- is run against production by mistake.
--
-- Safe to run repeatedly, and safe to run when nothing was seeded.
-- ============================================================================

begin;

do $$
declare
  demo_companies uuid[] := array[
    'd0000001-0000-4000-8000-000000000001','d0000001-0000-4000-8000-000000000002',
    'd0000001-0000-4000-8000-000000000003','d0000001-0000-4000-8000-000000000004',
    'd0000001-0000-4000-8000-000000000005'
  ]::uuid[];
  removed_users int;
  removed_companies int;
begin
  -- Child rows first, parents last (FK order).
  delete from public.operational_report_history where company_id = any(demo_companies);
  delete from public.operational_report_values   where company_id = any(demo_companies);
  delete from public.operational_reports         where company_id = any(demo_companies);
  delete from public.report_template_fields      where company_id = any(demo_companies);
  delete from public.report_templates            where company_id = any(demo_companies);

  delete from public.payroll_consolidation_classifications where company_id = any(demo_companies);
  delete from public.payroll_consolidations      where company_id = any(demo_companies);
  delete from public.payroll_period_history      where company_id = any(demo_companies);
  delete from public.payroll_periods             where company_id = any(demo_companies);
  delete from public.time_classifications        where company_id = any(demo_companies);

  delete from public.timesheet_entries           where company_id = any(demo_companies);
  delete from public.timesheets                  where company_id = any(demo_companies);

  delete from public.tasks                       where company_id = any(demo_companies);
  delete from public.assignment_assignees        where company_id = any(demo_companies);
  delete from public.assignments                 where company_id = any(demo_companies);
  delete from public.worker_availability         where company_id = any(demo_companies);
  -- Crew and partners are allocations onto a location (#77), so they go before
  -- it. Both cascade from `sites` anyway; they are named here because a
  -- teardown that relies on cascades is one schema change away from silently
  -- leaving rows behind.
  delete from public.site_crew                   where company_id = any(demo_companies);
  -- Either side is enough to make it demo data, and both sides are demo
  -- companies here — matching on one of them alone would leave the row behind
  -- if the demo set ever grows a partner outside it.
  delete from public.site_partners
    where company_id = any(demo_companies) or owner_company_id = any(demo_companies);
  delete from public.sites                       where company_id = any(demo_companies);

  delete from public.team_memberships            where company_id = any(demo_companies);
  delete from public.teams                       where company_id = any(demo_companies);

  delete from public.employee_records            where company_id = any(demo_companies);
  delete from public.notifications               where company_id = any(demo_companies);
  delete from public.reports                     where company_id = any(demo_companies);
  delete from public.audit_logs                  where company_id = any(demo_companies);

  delete from public.company_relationships
    where source_company_id = any(demo_companies) or target_company_id = any(demo_companies);

  delete from public.membership_roles
    where membership_id in (select id from public.company_memberships where company_id = any(demo_companies));
  delete from public.company_memberships         where company_id = any(demo_companies);
  delete from public.company_settings            where company_id = any(demo_companies);
  delete from public.companies                   where id = any(demo_companies);

  -- Demo people. Matched by UUID prefix, cross-checked against the demo
  -- email domain so a real account can never be caught by this.
  delete from public.certificates
    where user_id in (select id from public.users where id::text like 'd0000002-%' and email like '%.straton.demo');
  delete from public.professional_profiles
    where user_id in (select id from public.users where id::text like 'd0000002-%' and email like '%.straton.demo');
  delete from public.user_settings
    where user_id in (select id from public.users where id::text like 'd0000002-%' and email like '%.straton.demo');

  delete from public.users
    where id::text like 'd0000002-%' and email like '%.straton.demo';

  delete from auth.identities
    where user_id::text like 'd0000002-%'
      and user_id in (select id from auth.users where email like '%.straton.demo');
  delete from auth.users
    where id::text like 'd0000002-%' and email like '%.straton.demo';

  get diagnostics removed_users = row_count;

  select count(*) into removed_companies
    from public.companies where id = any(demo_companies);

  raise notice 'Demo teardown complete. Remaining demo companies: %, remaining demo auth users: %',
    removed_companies, (select count(*) from auth.users where email like '%.straton.demo');
end $$;

commit;

-- ---------------------------------------------------------------------------
-- Verification — every count must be 0
-- ---------------------------------------------------------------------------
select 'companies' as t, count(*) from public.companies where id::text like 'd0000001-%'
union all select 'public.users',      count(*) from public.users              where id::text like 'd0000002-%'
union all select 'auth.users',        count(*) from auth.users                where email like '%.straton.demo'
union all select 'memberships',       count(*) from public.company_memberships where id::text like 'd0000003-%'
union all select 'teams',             count(*) from public.teams              where id::text like 'd0000004-%'
union all select 'sites',             count(*) from public.sites              where id::text like 'd0000005-%'
union all select 'site_crew',         count(*) from public.site_crew          where company_id::text like 'd0000001-%'
union all select 'site_partners',     count(*) from public.site_partners      where owner_company_id::text like 'd0000001-%'
union all select 'timesheets',        count(*) from public.timesheets         where company_id::text like 'd0000001-%'
union all select 'timesheet_entries', count(*) from public.timesheet_entries  where company_id::text like 'd0000001-%'
union all select 'payroll_periods',   count(*) from public.payroll_periods    where id::text like 'd0000009-%'
union all select 'op_reports',        count(*) from public.operational_reports where id::text like 'd000000c-%'
order by 1;
