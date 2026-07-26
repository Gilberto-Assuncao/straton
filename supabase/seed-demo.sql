-- ============================================================================
-- STRATON — Demo dataset
-- ----------------------------------------------------------------------------
-- Populates the platform with three fully-operational fictitious companies so
-- every module (dashboard, timesheets, teams, projects, sites, payroll,
-- operational reports, notifications) has realistic data to render.
--
-- All rows created here use a `d000000x-` UUID prefix so the dataset can be
-- dropped again without touching real data. Re-running the file is safe: it
-- deletes the previous demo rows first.
--
-- Demo login password for every account: straton-demo-2026
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Reset previous demo data
-- ---------------------------------------------------------------------------
do $$
declare
  demo_companies uuid[] := array[
    'd0000001-0000-4000-8000-000000000001','d0000001-0000-4000-8000-000000000002',
    'd0000001-0000-4000-8000-000000000003','d0000001-0000-4000-8000-000000000004',
    'd0000001-0000-4000-8000-000000000005'
  ]::uuid[];
begin
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
  delete from public.project_memberships         where company_id = any(demo_companies);
  delete from public.sites                       where company_id = any(demo_companies);
  delete from public.projects                    where company_id = any(demo_companies);
  delete from public.team_memberships            where company_id = any(demo_companies);
  delete from public.teams                       where company_id = any(demo_companies);
  delete from public.employee_records            where company_id = any(demo_companies);
  delete from public.notifications               where company_id = any(demo_companies);
  delete from public.company_relationships
    where source_company_id = any(demo_companies) or target_company_id = any(demo_companies);
  delete from public.membership_roles
    where membership_id in (select id from public.company_memberships where company_id = any(demo_companies));
  delete from public.company_memberships         where company_id = any(demo_companies);
  delete from public.company_settings            where company_id = any(demo_companies);
  delete from public.companies                   where id = any(demo_companies);

  delete from public.certificates          where user_id::text like 'd0000002-%';
  delete from public.professional_profiles where user_id::text like 'd0000002-%';
  delete from public.user_settings         where user_id::text like 'd0000002-%';
  delete from public.users                 where id::text like 'd0000002-%';
  delete from auth.identities              where user_id::text like 'd0000002-%';
  delete from auth.users                   where id::text like 'd0000002-%';
end $$;

-- ---------------------------------------------------------------------------
-- 1. Role → permission matrix (global, currently empty in the database)
-- ---------------------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on true
where (r.key in ('owner','admin','administrator'))
   or (r.key = 'manager'    and p.key in ('projects.read','projects.manage','timesheets.read','timesheets.approve','timesheets.submit','reports.read'))
   or (r.key = 'supervisor' and p.key in ('projects.read','timesheets.read','timesheets.approve','timesheets.submit','reports.read'))
   or (r.key = 'hr'         and p.key in ('timesheets.read','reports.read','finance.read'))
   or (r.key in ('finance','accountant') and p.key in ('timesheets.read','reports.read','finance.read'))
   or (r.key in ('employee','contractor') and p.key in ('projects.read','timesheets.read','timesheets.submit'))
   or (r.key = 'viewer'     and p.key in ('projects.read','timesheets.read','reports.read'))
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Authentication accounts
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', v.id, 'authenticated', 'authenticated', v.email,
  crypt('straton-demo-2026', gen_salt('bf')), now(),
  '', '', '', '', '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', v.name),
  now() - interval '400 days', now()
from (values
  -- BELNEX ENERGY
  ('d0000002-0000-4000-8000-000000000101'::uuid,'Marc Dubois',       'marc.dubois@belnex.straton.demo'),
  ('d0000002-0000-4000-8000-000000000102'::uuid,'Sofia Almeida',     'sofia.almeida@belnex.straton.demo'),
  ('d0000002-0000-4000-8000-000000000103'::uuid,'Élodie Martin',     'elodie.martin@belnex.straton.demo'),
  ('d0000002-0000-4000-8000-000000000104'::uuid,'João Ferreira',     'joao.ferreira@belnex.straton.demo'),
  ('d0000002-0000-4000-8000-000000000105'::uuid,'Karim Benali',      'karim.benali@belnex.straton.demo'),
  ('d0000002-0000-4000-8000-000000000106'::uuid,'Lena Vermeulen',    'lena.vermeulen@belnex.straton.demo'),
  -- NORDCLEAN SERVICES
  ('d0000002-0000-4000-8000-000000000201'::uuid,'Anouk Peeters',     'anouk.peeters@nordclean.straton.demo'),
  ('d0000002-0000-4000-8000-000000000202'::uuid,'Ricardo Silva',     'ricardo.silva@nordclean.straton.demo'),
  ('d0000002-0000-4000-8000-000000000203'::uuid,'Fatima Haddad',     'fatima.haddad@nordclean.straton.demo'),
  ('d0000002-0000-4000-8000-000000000204'::uuid,'Piotr Kowalski',    'piotr.kowalski@nordclean.straton.demo'),
  ('d0000002-0000-4000-8000-000000000205'::uuid,'Maria Santos',      'maria.santos@nordclean.straton.demo'),
  -- GEOTECH ENGINEERING
  ('d0000002-0000-4000-8000-000000000301'::uuid,'Thomas Janssen',    'thomas.janssen@geotech.straton.demo'),
  ('d0000002-0000-4000-8000-000000000302'::uuid,'Ana Costa',         'ana.costa@geotech.straton.demo'),
  ('d0000002-0000-4000-8000-000000000303'::uuid,'Yannick Moreau',    'yannick.moreau@geotech.straton.demo'),
  ('d0000002-0000-4000-8000-000000000304'::uuid,'Dimitri Popescu',   'dimitri.popescu@geotech.straton.demo'),
  ('d0000002-0000-4000-8000-000000000305'::uuid,'Chloé Lambert',     'chloe.lambert@geotech.straton.demo')
) as v(id, name, email)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.id::text like 'd0000002-%'
on conflict do nothing;

-- Application-level user profiles
insert into public.users (id, name, email, first_name, last_name, display_name, phone, language, preferred_language, timezone, country, country_code, status, created_at)
values
  ('d0000002-0000-4000-8000-000000000101','Marc Dubois','marc.dubois@belnex.straton.demo','Marc','Dubois','Marc','+32 475 11 22 33','fr','fr','Europe/Brussels','Belgium','BE','active', now() - interval '400 days'),
  ('d0000002-0000-4000-8000-000000000102','Sofia Almeida','sofia.almeida@belnex.straton.demo','Sofia','Almeida','Sofia','+32 476 22 33 44','pt','pt','Europe/Brussels','Belgium','BE','active', now() - interval '380 days'),
  ('d0000002-0000-4000-8000-000000000103','Élodie Martin','elodie.martin@belnex.straton.demo','Élodie','Martin','Élodie','+32 477 33 44 55','fr','fr','Europe/Brussels','Belgium','BE','active', now() - interval '360 days'),
  ('d0000002-0000-4000-8000-000000000104','João Ferreira','joao.ferreira@belnex.straton.demo','João','Ferreira','João','+32 478 44 55 66','pt','pt','Europe/Brussels','Belgium','BE','active', now() - interval '320 days'),
  ('d0000002-0000-4000-8000-000000000105','Karim Benali','karim.benali@belnex.straton.demo','Karim','Benali','Karim','+32 479 55 66 77','fr','fr','Europe/Brussels','Belgium','BE','active', now() - interval '300 days'),
  ('d0000002-0000-4000-8000-000000000106','Lena Vermeulen','lena.vermeulen@belnex.straton.demo','Lena','Vermeulen','Lena','+32 470 66 77 88','nl','nl','Europe/Brussels','Belgium','BE','active', now() - interval '120 days'),

  ('d0000002-0000-4000-8000-000000000201','Anouk Peeters','anouk.peeters@nordclean.straton.demo','Anouk','Peeters','Anouk','+32 471 11 22 33','nl','nl','Europe/Brussels','Belgium','BE','active', now() - interval '500 days'),
  ('d0000002-0000-4000-8000-000000000202','Ricardo Silva','ricardo.silva@nordclean.straton.demo','Ricardo','Silva','Ricardo','+32 472 22 33 44','pt','pt','Europe/Brussels','Belgium','BE','active', now() - interval '450 days'),
  ('d0000002-0000-4000-8000-000000000203','Fatima Haddad','fatima.haddad@nordclean.straton.demo','Fatima','Haddad','Fatima','+32 473 33 44 55','fr','fr','Europe/Brussels','Belgium','BE','active', now() - interval '400 days'),
  ('d0000002-0000-4000-8000-000000000204','Piotr Kowalski','piotr.kowalski@nordclean.straton.demo','Piotr','Kowalski','Piotr','+32 474 44 55 66','pl','pl','Europe/Brussels','Belgium','BE','active', now() - interval '280 days'),
  ('d0000002-0000-4000-8000-000000000205','Maria Santos','maria.santos@nordclean.straton.demo','Maria','Santos','Maria','+32 475 55 66 77','pt','pt','Europe/Brussels','Belgium','BE','active', now() - interval '260 days'),

  ('d0000002-0000-4000-8000-000000000301','Thomas Janssen','thomas.janssen@geotech.straton.demo','Thomas','Janssen','Thomas','+32 481 11 22 33','nl','nl','Europe/Brussels','Belgium','BE','active', now() - interval '600 days'),
  ('d0000002-0000-4000-8000-000000000302','Ana Costa','ana.costa@geotech.straton.demo','Ana','Costa','Ana','+32 482 22 33 44','pt','pt','Europe/Brussels','Belgium','BE','active', now() - interval '520 days'),
  ('d0000002-0000-4000-8000-000000000303','Yannick Moreau','yannick.moreau@geotech.straton.demo','Yannick','Moreau','Yannick','+32 483 33 44 55','fr','fr','Europe/Brussels','Belgium','BE','active', now() - interval '480 days'),
  ('d0000002-0000-4000-8000-000000000304','Dimitri Popescu','dimitri.popescu@geotech.straton.demo','Dimitri','Popescu','Dimitri','+32 484 44 55 66','ro','ro','Europe/Brussels','Belgium','BE','active', now() - interval '340 days'),
  ('d0000002-0000-4000-8000-000000000305','Chloé Lambert','chloe.lambert@geotech.straton.demo','Chloé','Lambert','Chloé','+32 485 55 66 77','fr','fr','Europe/Brussels','Belgium','BE','active', now() - interval '200 days')
on conflict (id) do nothing;

insert into public.user_settings (user_id)
select id from public.users where id::text like 'd0000002-%'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 3. Companies
-- ---------------------------------------------------------------------------
insert into public.companies (
  id, name, legal_name, display_name, slug, vat_number, registration_number,
  country, country_code, city, region, street_address, postal_code,
  phone, email, website, default_language, currency, timezone, status, activity_start_date
) values
  ('d0000001-0000-4000-8000-000000000001','BELNEX ENERGY','Belnex Energy SRL','Belnex Energy','belnex-energy-demo',
   'BE0784512963','0784.512.963','Belgium','BE','Brussels','Brussels-Capital','Avenue Louise 143','1050',
   '+32 2 512 44 90','contact@belnex.straton.demo','https://belnex.straton.demo','fr','EUR','Europe/Brussels','active','2019-04-01'),

  ('d0000001-0000-4000-8000-000000000002','NORDCLEAN SERVICES','Nordclean Services BV','Nordclean','nordclean-services-demo',
   'BE0655231478','0655.231.478','Belgium','BE','Antwerp','Flanders','Noorderlaan 88','2030',
   '+32 3 445 12 70','contact@nordclean.straton.demo','https://nordclean.straton.demo','nl','EUR','Europe/Brussels','active','2016-09-15'),

  ('d0000001-0000-4000-8000-000000000003','GEOTECH ENGINEERING','GeoTech Engineering SA','GeoTech','geotech-engineering-demo',
   'BE0712894553','0712.894.553','Belgium','BE','Liège','Wallonia','Rue de la Station 22','4000',
   '+32 4 223 78 15','contact@geotech.straton.demo','https://geotech.straton.demo','fr','EUR','Europe/Brussels','active','2013-02-20'),

  -- Client-only companies (no users; used as project/site clients)
  ('d0000001-0000-4000-8000-000000000004','Résidence Le Parc','Résidence Le Parc SA','Le Parc','residence-le-parc-demo',
   'BE0699112233','0699.112.233','Belgium','BE','Namur','Wallonia','Chaussée de Dinant 410','5000',
   '+32 81 22 11 44','syndic@leparc.straton.demo',null,'fr','EUR','Europe/Brussels','active','2008-06-01'),

  ('d0000001-0000-4000-8000-000000000005','Havenbedrijf Noord','Havenbedrijf Noord NV','Haven Noord','havenbedrijf-noord-demo',
   'BE0633445566','0633.445.566','Belgium','BE','Antwerp','Flanders','Scheldelaan 12','2040',
   '+32 3 205 66 00','info@havennoord.straton.demo',null,'nl','EUR','Europe/Brussels','active','2001-01-10')
on conflict (id) do nothing;

insert into public.company_settings (
  company_id, approval_required, week_starts_on, notifications_enabled, accounting_provider,
  date_format, time_format, expected_start_time, expected_end_time, grace_minutes, punctuality_reminders_enabled
) values
  ('d0000001-0000-4000-8000-000000000001', true, 1, true, 'Exact Online','dd/MM/yyyy','HH:mm','08:00','17:00',10,true),
  ('d0000001-0000-4000-8000-000000000002', true, 1, true, 'Yuki',         'dd/MM/yyyy','HH:mm','06:00','14:00',15,true),
  ('d0000001-0000-4000-8000-000000000003', true, 1, true, 'Winbooks',     'dd/MM/yyyy','HH:mm','08:30','17:30',10,false)
on conflict (company_id) do nothing;

insert into public.company_relationships (id, source_company_id, target_company_id, relationship_type, status) values
  ('d000000e-0000-4000-8000-000000000001','d0000001-0000-4000-8000-000000000001','d0000001-0000-4000-8000-000000000004','client','active'),
  ('d000000e-0000-4000-8000-000000000002','d0000001-0000-4000-8000-000000000002','d0000001-0000-4000-8000-000000000005','client','active'),
  ('d000000e-0000-4000-8000-000000000003','d0000001-0000-4000-8000-000000000003','d0000001-0000-4000-8000-000000000004','client','active'),
  ('d000000e-0000-4000-8000-000000000004','d0000001-0000-4000-8000-000000000001','d0000001-0000-4000-8000-000000000003','subcontractor','active'),
  ('d000000e-0000-4000-8000-000000000005','d0000001-0000-4000-8000-000000000002','d0000001-0000-4000-8000-000000000001','partner','active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Memberships, roles and employment records
-- ---------------------------------------------------------------------------
insert into public.company_memberships (id, company_id, user_id, job_title, function_name, status, joined_at) values
  -- Belnex Energy
  ('d0000003-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000101','Managing Director','Direction','active', now() - interval '400 days'),
  ('d0000003-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000102','Operations Manager','Operations','active', now() - interval '380 days'),
  ('d0000003-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000103','HR & Payroll Officer','Human Resources','active', now() - interval '360 days'),
  ('d0000003-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000104','Senior Solar Technician','Field','active', now() - interval '320 days'),
  ('d0000003-0000-4000-8000-000000000105','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000105','Electrician','Field','active', now() - interval '300 days'),
  ('d0000003-0000-4000-8000-000000000106','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000106','Apprentice Technician','Field','active', now() - interval '120 days'),
  -- Nordclean Services
  ('d0000003-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000201','Managing Director','Direction','active', now() - interval '500 days'),
  ('d0000003-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000202','Site Supervisor','Operations','active', now() - interval '450 days'),
  ('d0000003-0000-4000-8000-000000000203','d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000203','HR Officer','Human Resources','active', now() - interval '400 days'),
  ('d0000003-0000-4000-8000-000000000204','d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000204','Cleaning Operative','Field','active', now() - interval '280 days'),
  ('d0000003-0000-4000-8000-000000000205','d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000205','Cleaning Operative','Field','active', now() - interval '260 days'),
  -- GeoTech Engineering
  ('d0000003-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000301','Managing Director','Direction','active', now() - interval '600 days'),
  ('d0000003-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000302','Project Manager','Operations','active', now() - interval '520 days'),
  ('d0000003-0000-4000-8000-000000000303','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000303','Financial Controller','Finance','active', now() - interval '480 days'),
  ('d0000003-0000-4000-8000-000000000304','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000304','Maintenance Technician','Field','active', now() - interval '340 days'),
  ('d0000003-0000-4000-8000-000000000305','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000305','Survey Engineer','Field','active', now() - interval '200 days')
on conflict (id) do nothing;

insert into public.membership_roles (membership_id, role_id)
select m.membership_id::uuid, r.id
from (values
  ('d0000003-0000-4000-8000-000000000101','owner'),   ('d0000003-0000-4000-8000-000000000101','admin'),
  ('d0000003-0000-4000-8000-000000000102','manager'), ('d0000003-0000-4000-8000-000000000102','supervisor'),
  ('d0000003-0000-4000-8000-000000000103','hr'),
  ('d0000003-0000-4000-8000-000000000104','employee'),
  ('d0000003-0000-4000-8000-000000000105','employee'),
  ('d0000003-0000-4000-8000-000000000106','employee'),

  ('d0000003-0000-4000-8000-000000000201','owner'),   ('d0000003-0000-4000-8000-000000000201','admin'),
  ('d0000003-0000-4000-8000-000000000202','supervisor'),
  ('d0000003-0000-4000-8000-000000000203','hr'),
  ('d0000003-0000-4000-8000-000000000204','employee'),
  ('d0000003-0000-4000-8000-000000000205','employee'),

  ('d0000003-0000-4000-8000-000000000301','owner'),   ('d0000003-0000-4000-8000-000000000301','admin'),
  ('d0000003-0000-4000-8000-000000000302','manager'),
  ('d0000003-0000-4000-8000-000000000303','finance'), ('d0000003-0000-4000-8000-000000000303','accountant'),
  ('d0000003-0000-4000-8000-000000000304','employee'),
  ('d0000003-0000-4000-8000-000000000305','employee')
) as m(membership_id, role_key)
join public.roles r on r.key = m.role_key
on conflict do nothing;

insert into public.employee_records (
  id, company_id, company_membership_id, employee_code, job_title, employment_type,
  employment_status, start_date, weekly_hours, manager_membership_id, cost_visibility
) values
  ('d000000f-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000003-0000-4000-8000-000000000101','BLX-001','Managing Director','company_owner','active', current_date - 400, 40, null,'management'),
  ('d000000f-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','d0000003-0000-4000-8000-000000000102','BLX-002','Operations Manager','employee','active', current_date - 380, 40,'d0000003-0000-4000-8000-000000000101','management'),
  ('d000000f-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001','d0000003-0000-4000-8000-000000000103','BLX-003','HR & Payroll Officer','employee','active', current_date - 360, 38,'d0000003-0000-4000-8000-000000000101','finance'),
  ('d000000f-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','d0000003-0000-4000-8000-000000000104','BLX-004','Senior Solar Technician','employee','active', current_date - 320, 40,'d0000003-0000-4000-8000-000000000102','restricted'),
  ('d000000f-0000-4000-8000-000000000105','d0000001-0000-4000-8000-000000000001','d0000003-0000-4000-8000-000000000105','BLX-005','Electrician','worker','active', current_date - 300, 40,'d0000003-0000-4000-8000-000000000102','restricted'),
  ('d000000f-0000-4000-8000-000000000106','d0000001-0000-4000-8000-000000000001','d0000003-0000-4000-8000-000000000106','BLX-006','Apprentice Technician','apprentice','active', current_date - 120, 32,'d0000003-0000-4000-8000-000000000102','restricted'),

  ('d000000f-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d0000003-0000-4000-8000-000000000201','NCL-001','Managing Director','company_owner','active', current_date - 500, 40, null,'management'),
  ('d000000f-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','d0000003-0000-4000-8000-000000000202','NCL-002','Site Supervisor','employee','active', current_date - 450, 38,'d0000003-0000-4000-8000-000000000201','management'),
  ('d000000f-0000-4000-8000-000000000203','d0000001-0000-4000-8000-000000000002','d0000003-0000-4000-8000-000000000203','NCL-003','HR Officer','employee','active', current_date - 400, 38,'d0000003-0000-4000-8000-000000000201','finance'),
  ('d000000f-0000-4000-8000-000000000204','d0000001-0000-4000-8000-000000000002','d0000003-0000-4000-8000-000000000204','NCL-004','Cleaning Operative','worker','active', current_date - 280, 38,'d0000003-0000-4000-8000-000000000202','restricted'),
  ('d000000f-0000-4000-8000-000000000205','d0000001-0000-4000-8000-000000000002','d0000003-0000-4000-8000-000000000205','NCL-005','Cleaning Operative','temporary','active', current_date - 260, 24,'d0000003-0000-4000-8000-000000000202','restricted'),

  ('d000000f-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000003-0000-4000-8000-000000000301','GTC-001','Managing Director','company_owner','active', current_date - 600, 40, null,'management'),
  ('d000000f-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003','d0000003-0000-4000-8000-000000000302','GTC-002','Project Manager','employee','active', current_date - 520, 40,'d0000003-0000-4000-8000-000000000301','management'),
  ('d000000f-0000-4000-8000-000000000303','d0000001-0000-4000-8000-000000000003','d0000003-0000-4000-8000-000000000303','GTC-003','Financial Controller','employee','active', current_date - 480, 40,'d0000003-0000-4000-8000-000000000301','finance'),
  ('d000000f-0000-4000-8000-000000000304','d0000001-0000-4000-8000-000000000003','d0000003-0000-4000-8000-000000000304','GTC-004','Maintenance Technician','employee','active', current_date - 340, 40,'d0000003-0000-4000-8000-000000000302','restricted'),
  ('d000000f-0000-4000-8000-000000000305','d0000001-0000-4000-8000-000000000003','d0000003-0000-4000-8000-000000000305','GTC-005','Survey Engineer','contractor','active', current_date - 200, 36,'d0000003-0000-4000-8000-000000000302','restricted')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Teams
-- ---------------------------------------------------------------------------
-- Leaders are attached after team_memberships exist: a trigger requires the
-- leader to already hold an active 'leader' membership in the team.
insert into public.teams (id, company_id, name, description, status, color, icon) values
  ('d0000004-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','Solar Installation','Rooftop PV installation crew','active','#4ADE80','sun'),
  ('d0000004-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','Electrical Works','Grid connection and inverter commissioning','active','#F59E0B','bolt'),
  ('d0000004-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','Day Shift','Office and retail cleaning, 06:00–14:00','active','#38BDF8','sun'),
  ('d0000004-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','Industrial Cleaning','Port and warehouse contracts','active','#A78BFA','factory'),
  ('d0000004-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','Maintenance','Preventive and corrective maintenance','active','#4ADE80','wrench'),
  ('d0000004-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003','Survey & Inspection','Topographic survey and structural inspection','active','#F87171','compass')
on conflict (id) do nothing;

insert into public.team_memberships (id, company_id, team_id, company_membership_id, team_role, joined_at) values
  ('d0000010-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000004-0000-4000-8000-000000000101','d0000003-0000-4000-8000-000000000104','leader',    now() - interval '300 days'),
  ('d0000010-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','d0000004-0000-4000-8000-000000000101','d0000003-0000-4000-8000-000000000106','member',    now() - interval '120 days'),
  ('d0000010-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001','d0000004-0000-4000-8000-000000000101','d0000003-0000-4000-8000-000000000102','supervisor',now() - interval '300 days'),
  ('d0000010-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','d0000004-0000-4000-8000-000000000102','d0000003-0000-4000-8000-000000000105','leader',    now() - interval '290 days'),
  ('d0000010-0000-4000-8000-000000000105','d0000001-0000-4000-8000-000000000001','d0000004-0000-4000-8000-000000000102','d0000003-0000-4000-8000-000000000104','member',    now() - interval '200 days'),

  ('d0000010-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d0000004-0000-4000-8000-000000000201','d0000003-0000-4000-8000-000000000202','leader',    now() - interval '440 days'),
  ('d0000010-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','d0000004-0000-4000-8000-000000000201','d0000003-0000-4000-8000-000000000204','member',    now() - interval '270 days'),
  ('d0000010-0000-4000-8000-000000000203','d0000001-0000-4000-8000-000000000002','d0000004-0000-4000-8000-000000000202','d0000003-0000-4000-8000-000000000205','member',    now() - interval '250 days'),
  ('d0000010-0000-4000-8000-000000000204','d0000001-0000-4000-8000-000000000002','d0000004-0000-4000-8000-000000000202','d0000003-0000-4000-8000-000000000202','leader',now() - interval '440 days'),

  ('d0000010-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000004-0000-4000-8000-000000000301','d0000003-0000-4000-8000-000000000304','leader',    now() - interval '330 days'),
  ('d0000010-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003','d0000004-0000-4000-8000-000000000301','d0000003-0000-4000-8000-000000000302','supervisor',now() - interval '500 days'),
  ('d0000010-0000-4000-8000-000000000303','d0000001-0000-4000-8000-000000000003','d0000004-0000-4000-8000-000000000302','d0000003-0000-4000-8000-000000000305','leader',    now() - interval '190 days')
on conflict (id) do nothing;

update public.teams t set leader_membership_id = v.leader::uuid
from (values
  ('d0000004-0000-4000-8000-000000000101','d0000003-0000-4000-8000-000000000104'),
  ('d0000004-0000-4000-8000-000000000102','d0000003-0000-4000-8000-000000000105'),
  ('d0000004-0000-4000-8000-000000000201','d0000003-0000-4000-8000-000000000202'),
  ('d0000004-0000-4000-8000-000000000202','d0000003-0000-4000-8000-000000000202'),
  ('d0000004-0000-4000-8000-000000000301','d0000003-0000-4000-8000-000000000304'),
  ('d0000004-0000-4000-8000-000000000302','d0000003-0000-4000-8000-000000000305')
) as v(team, leader) where t.id = v.team::uuid;

-- ---------------------------------------------------------------------------
-- 6. Projects, sites, memberships and tasks
-- ---------------------------------------------------------------------------
insert into public.projects (
  id, company_id, client_company_id, name, description, status, manager_id,
  starts_at, ends_at, estimated_hours, cost_center, priority, budget_amount, budget_spent, budget_currency
) values
  ('d0000006-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000001-0000-4000-8000-000000000004',
   'Le Parc — Rooftop PV 320 kWp','Installation of 780 panels across four residential blocks, including inverter room retrofit.',
   'active','d0000002-0000-4000-8000-000000000102', current_date - 90, current_date + 45, 2400,'CC-SOLAR','high', 412000, 268400,'EUR'),
  ('d0000006-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001',null,
   'Grid Connection Upgrade — Louise','Medium-voltage cabin upgrade and metering replacement for the Louise office complex.',
   'active','d0000002-0000-4000-8000-000000000102', current_date - 40, current_date + 20, 640,'CC-GRID','critical', 96000, 51200,'EUR'),
  ('d0000006-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001',null,
   'Maintenance Contract 2026','Annual preventive maintenance across the installed base.',
   'planning','d0000002-0000-4000-8000-000000000101', current_date + 30, current_date + 395, 1200,'CC-MAINT','medium', 145000, 0,'EUR'),

  ('d0000006-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d0000001-0000-4000-8000-000000000005',
   'Haven Noord — Warehouse Cleaning','Daily industrial cleaning of three warehouse halls and loading bays.',
   'active','d0000002-0000-4000-8000-000000000202', current_date - 200, current_date + 165, 5200,'CC-IND','high', 318000, 187600,'EUR'),
  ('d0000006-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002',null,
   'Office Cleaning Circuit — Antwerp','Rotating morning circuit covering eleven office clients in Antwerp centre.',
   'active','d0000002-0000-4000-8000-000000000202', current_date - 320, current_date + 45, 3800,'CC-OFF','medium', 142000, 121300,'EUR'),

  ('d0000006-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000001-0000-4000-8000-000000000004',
   'Le Parc — Structural Inspection','Full structural survey and load assessment ahead of the PV installation.',
   'completed','d0000002-0000-4000-8000-000000000302', current_date - 180, current_date - 100, 420,'CC-SURV','high', 68000, 64200,'EUR'),
  ('d0000006-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003',null,
   'HVAC Preventive Maintenance','Quarterly HVAC maintenance rounds across twelve client sites.',
   'active','d0000002-0000-4000-8000-000000000302', current_date - 150, current_date + 215, 1800,'CC-HVAC','medium', 214000, 96300,'EUR'),
  ('d0000006-0000-4000-8000-000000000303','d0000001-0000-4000-8000-000000000003',null,
   'Topographic Survey — Meuse Bank','Riverbank topographic survey for the regional flood-defence study.',
   'paused','d0000002-0000-4000-8000-000000000302', current_date - 60, current_date + 90, 300,'CC-SURV','low', 47000, 18900,'EUR')
on conflict (id) do nothing;

insert into public.sites (
  id, company_id, project_id, client_company_id, name, address, latitude, longitude,
  po_number, cost_center, manager_id, starts_at, ends_at, status, reference
) values
  ('d0000005-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000004',
   'Le Parc — Block A','{"street":"Chaussée de Dinant 410","city":"Namur","postal_code":"5000","country":"BE"}'::jsonb,
   50.4530, 4.8720,'PO-2026-0141','CC-SOLAR','d0000002-0000-4000-8000-000000000102', current_date - 90, current_date + 20,'active','SITE-BLX-A'),
  ('d0000005-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000004',
   'Le Parc — Block C','{"street":"Chaussée de Dinant 414","city":"Namur","postal_code":"5000","country":"BE"}'::jsonb,
   50.4535, 4.8731,'PO-2026-0142','CC-SOLAR','d0000002-0000-4000-8000-000000000102', current_date - 40, current_date + 45,'active','SITE-BLX-C'),
  ('d0000005-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000102',null,
   'Louise MV Cabin','{"street":"Avenue Louise 143","city":"Brussels","postal_code":"1050","country":"BE"}'::jsonb,
   50.8270, 4.3610,'PO-2026-0155','CC-GRID','d0000002-0000-4000-8000-000000000102', current_date - 40, current_date + 20,'active','SITE-BLX-LOU'),

  ('d0000005-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000005',
   'Haven Noord — Hall 3','{"street":"Scheldelaan 12","city":"Antwerp","postal_code":"2040","country":"BE"}'::jsonb,
   51.2960, 4.3210,'PO-2026-0088','CC-IND','d0000002-0000-4000-8000-000000000202', current_date - 200, current_date + 165,'active','SITE-NCL-H3'),
  ('d0000005-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000202',null,
   'Meir Office Tower','{"street":"Meir 78","city":"Antwerp","postal_code":"2000","country":"BE"}'::jsonb,
   51.2185, 4.4065,'PO-2026-0092','CC-OFF','d0000002-0000-4000-8000-000000000202', current_date - 320, current_date + 45,'active','SITE-NCL-MEIR'),

  ('d0000005-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000302',null,
   'Liège Tech Park — HVAC','{"street":"Rue de la Station 22","city":"Liège","postal_code":"4000","country":"BE"}'::jsonb,
   50.6330, 5.5680,'PO-2026-0203','CC-HVAC','d0000002-0000-4000-8000-000000000302', current_date - 150, current_date + 215,'active','SITE-GTC-HVAC'),
  ('d0000005-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000303',null,
   'Meuse Riverbank Sector 4','{"street":"Quai de Rome","city":"Liège","postal_code":"4000","country":"BE"}'::jsonb,
   50.6262, 5.5710,'PO-2026-0211','CC-SURV','d0000002-0000-4000-8000-000000000302', current_date - 60, current_date + 90,'paused','SITE-GTC-MEUSE')
on conflict (id) do nothing;

insert into public.project_memberships (id, company_id, project_id, company_membership_id, role, joined_at)
select
  ('d0000011-0000-4000-8000-0000000' || lpad(row_number() over (order by v.project_id, v.membership_id)::text, 5, '0'))::uuid,
  v.company_id::uuid, v.project_id::uuid, v.membership_id::uuid, v.role, now() - interval '90 days'
from (values
  ('d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000101','d0000003-0000-4000-8000-000000000102','manager'),
  ('d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000101','d0000003-0000-4000-8000-000000000104','lead'),
  ('d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000101','d0000003-0000-4000-8000-000000000106','member'),
  ('d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000102','d0000003-0000-4000-8000-000000000105','lead'),
  ('d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000102','d0000003-0000-4000-8000-000000000104','member'),
  ('d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000201','d0000003-0000-4000-8000-000000000202','manager'),
  ('d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000201','d0000003-0000-4000-8000-000000000205','member'),
  ('d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000202','d0000003-0000-4000-8000-000000000204','lead'),
  ('d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000302','d0000003-0000-4000-8000-000000000302','manager'),
  ('d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000302','d0000003-0000-4000-8000-000000000304','lead'),
  ('d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000303','d0000003-0000-4000-8000-000000000305','lead')
) as v(company_id, project_id, membership_id, role)
on conflict (id) do nothing;

insert into public.tasks (id, company_id, project_id, name, status) values
  ('d0000007-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000101','Panel mounting','active'),
  ('d0000007-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000101','Cable routing','active'),
  ('d0000007-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000102','Inverter commissioning','active'),
  ('d0000007-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','d0000006-0000-4000-8000-000000000102','Metering replacement','active'),
  ('d0000007-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000201','Floor scrubbing','active'),
  ('d0000007-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000201','Waste handling','active'),
  ('d0000007-0000-4000-8000-000000000203','d0000001-0000-4000-8000-000000000002','d0000006-0000-4000-8000-000000000202','Office round','active'),
  ('d0000007-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000302','Filter replacement','active'),
  ('d0000007-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000302','Coolant check','active'),
  ('d0000007-0000-4000-8000-000000000303','d0000001-0000-4000-8000-000000000003','d0000006-0000-4000-8000-000000000303','Field measurement','active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Time classifications (drive the payroll consolidation report)
-- ---------------------------------------------------------------------------
insert into public.time_classifications (id, company_id, code, name, description, active, requires_approval, appears_in_payroll_report, allows_note, display_order)
select
  ('d0000008-0000-4000-8000-0000000' || lpad(row_number() over (order by c.company_id, v.display_order)::text, 5, '0'))::uuid,
  c.company_id::uuid, v.code, v.name, v.description, true, v.requires_approval, true, v.allows_note, v.display_order
from (values
  ('NORM','Normal hours','Contractual working hours', false, false, 1),
  ('OT25','Overtime 25%','Hours beyond the daily contractual limit', true, true, 2),
  ('OT50','Overtime 50%','Weekend and public holiday work', true, true, 3),
  ('TRAV','Travel time','Compensated travel between sites', false, true, 4),
  ('SICK','Sick leave','Certified absence', true, true, 5),
  ('HOL','Paid holiday','Statutory annual leave', true, false, 6),
  ('TRAIN','Training','Certified training and safety courses', false, true, 7)
) as v(code, name, description, requires_approval, allows_note, display_order)
cross join (values
  ('d0000001-0000-4000-8000-000000000001'),
  ('d0000001-0000-4000-8000-000000000002'),
  ('d0000001-0000-4000-8000-000000000003')
) as c(company_id)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Timesheets — six weeks of realistic activity per field worker
-- ---------------------------------------------------------------------------
do $$
declare
  emp        record;
  wk         int;
  d          int;
  ts_id      uuid;
  p_start    date;
  p_end      date;
  ts_status  timesheet_status;
  day_date   date;
  start_ts   timestamptz;
  end_ts     timestamptz;
  projs      uuid[];
  site_ids   uuid[];
  task_ids   uuid[];
  idx        int;
  end_hour   int;
  brk        int;
  this_monday date := date_trunc('week', current_date)::date;
begin
  for emp in
    select cm.user_id, cm.company_id, cm.id as membership_id,
           (select u.id
              from public.company_memberships cm2
              join public.membership_roles mr on mr.membership_id = cm2.id
              join public.roles r on r.id = mr.role_id and r.key in ('owner','admin')
              join public.users u on u.id = cm2.user_id
             where cm2.company_id = cm.company_id
             limit 1) as approver_id
      from public.company_memberships cm
      join public.employee_records er on er.company_membership_id = cm.id
     where cm.company_id in (
             'd0000001-0000-4000-8000-000000000001',
             'd0000001-0000-4000-8000-000000000002',
             'd0000001-0000-4000-8000-000000000003')
       and er.employment_type in ('employee','worker','contractor','temporary','apprentice')
       and cm.job_title not in ('Managing Director','HR & Payroll Officer','HR Officer','Financial Controller')
  loop
    select array_agg(id order by id) into projs
      from public.projects where company_id = emp.company_id and status = 'active';
    select array_agg(id order by id) into site_ids
      from public.sites where company_id = emp.company_id;
    select array_agg(id order by id) into task_ids
      from public.tasks where company_id = emp.company_id;

    continue when projs is null or site_ids is null;

    for wk in reverse 5..0 loop
      p_start := this_monday - (wk * 7);
      p_end   := p_start + 6;

      ts_status := case when wk >= 2 then 'approved'
                        when wk = 1  then 'submitted'
                        else 'draft' end::timesheet_status;

      ts_id := gen_random_uuid();
      insert into public.timesheets (id, company_id, user_id, period_start, period_end, status, submitted_at, reviewed_by, reviewed_at)
      values (
        ts_id, emp.company_id, emp.user_id, p_start, p_end, ts_status,
        case when ts_status in ('submitted','approved') then (p_end + time '18:30')::timestamptz else null end,
        case when ts_status = 'approved' then emp.approver_id else null end,
        case when ts_status = 'approved' then (p_end + 1 + time '09:15')::timestamptz else null end
      );

      for d in 0..4 loop
        day_date := p_start + d;
        continue when day_date > current_date;

        -- One absence: mid-period Wednesday four weeks back
        continue when wk = 4 and d = 2;

        idx := 1 + ((wk * 5 + d) % array_length(projs, 1));

        -- Long shifts on the last working day of some weeks feed the
        -- "hour divergence" KPI (anything over 10h net).
        end_hour := case when d = 4 and wk % 2 = 0 then 19 else 17 end;
        brk      := case when end_hour = 19 then 45 else 30 end;

        start_ts := (day_date + time '08:00')::timestamptz;
        end_ts   := (day_date + make_time(end_hour, 0, 0))::timestamptz;

        insert into public.timesheet_entries (
          id, company_id, timesheet_id, project_id, site_id, task_id,
          starts_at, ends_at, break_minutes, notes, status,
          start_latitude, start_longitude
        ) values (
          gen_random_uuid(), emp.company_id, ts_id,
          projs[idx],
          site_ids[1 + ((wk * 5 + d) % array_length(site_ids, 1))],
          case when task_ids is null then null else task_ids[1 + ((wk * 5 + d) % array_length(task_ids, 1))] end,
          start_ts, end_ts, brk,
          case when end_hour = 19 then 'Extended shift to close the weekly milestone.' else null end,
          ts_status,
          50.8 + (d * 0.01), 4.35 + (wk * 0.01)
        );
      end loop;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Payroll periods and consolidations (derived from approved hours)
-- ---------------------------------------------------------------------------
insert into public.payroll_periods (id, company_id, period_start, period_end, status, closed_by, closed_at)
select
  ('d0000009-0000-4000-8000-0000000' || lpad(row_number() over (order by c.company_id, v.offset_months)::text, 5, '0'))::uuid,
  c.company_id::uuid,
  (date_trunc('month', current_date) - (v.offset_months || ' months')::interval)::date,
  (date_trunc('month', current_date) - (v.offset_months || ' months')::interval + interval '1 month - 1 day')::date,
  v.status::payroll_period_status,
  case when v.status = 'closed' then c.owner_id::uuid else null end,
  case when v.status = 'closed' then now() - interval '20 days' else null end
from (values (1,'closed'), (0,'in_review')) as v(offset_months, status)
cross join (values
  ('d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000101'),
  ('d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000201'),
  ('d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000301')
) as c(company_id, owner_id)
on conflict (id) do nothing;

do $$
declare
  per      record;
  wrk      record;
  cons_id  uuid;
  reg_min  int;
  app_min  int;
  exp_min  int;
  norm_id  uuid;
  ot_id    uuid;
  trav_id  uuid;
begin
  for per in select * from public.payroll_periods where id::text like 'd0000009-%' loop
    select id into norm_id from public.time_classifications where company_id = per.company_id and code = 'NORM';
    select id into ot_id   from public.time_classifications where company_id = per.company_id and code = 'OT25';
    select id into trav_id from public.time_classifications where company_id = per.company_id and code = 'TRAV';

    for wrk in
      select t.user_id,
             coalesce(sum(
               extract(epoch from (e.ends_at - e.starts_at)) / 60 - e.break_minutes
             ) filter (where e.starts_at::date between per.period_start and per.period_end), 0)::int as registered,
             coalesce(sum(
               extract(epoch from (e.ends_at - e.starts_at)) / 60 - e.break_minutes
             ) filter (where e.status = 'approved' and e.starts_at::date between per.period_start and per.period_end), 0)::int as approved,
             er.weekly_hours
        from public.timesheets t
        join public.timesheet_entries e on e.timesheet_id = t.id
        join public.company_memberships cm on cm.user_id = t.user_id and cm.company_id = t.company_id
        join public.employee_records er on er.company_membership_id = cm.id
       where t.company_id = per.company_id
       group by t.user_id, er.weekly_hours
      loop
      continue when wrk.registered = 0;

      reg_min := wrk.registered;
      app_min := wrk.approved;
      exp_min := (coalesce(wrk.weekly_hours, 38) * 60 * 4.33)::int;

      cons_id := gen_random_uuid();
      insert into public.payroll_consolidations (
        id, company_id, payroll_period_id, worker_id,
        expected_minutes, registered_minutes, approved_minutes,
        mileage_km, reimbursable_expenses, benefits_amount, manual_adjustment, accounting_notes
      ) values (
        cons_id, per.company_id, per.id, wrk.user_id,
        exp_min, reg_min, app_min,
        round((reg_min / 60.0) * 3.4)::numeric,
        round((reg_min / 60.0) * 1.15, 2)::numeric,
        round((reg_min / 60.0) * 0.85, 2)::numeric,
        0,
        case when app_min < reg_min
             then 'Hours pending approval at the time of consolidation.'
             else 'Fully approved — ready for export.' end
      );

      insert into public.payroll_consolidation_classifications (id, consolidation_id, classification_id, company_id, minutes, note)
      values
        (gen_random_uuid(), cons_id, norm_id, per.company_id, least(app_min, exp_min), null),
        (gen_random_uuid(), cons_id, ot_id,   per.company_id, greatest(app_min - exp_min, 0),
         case when app_min > exp_min then 'Overtime driven by extended end-of-week shifts.' else null end),
        (gen_random_uuid(), cons_id, trav_id, per.company_id, round(reg_min * 0.06)::int, 'Inter-site travel allowance.');
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Operational report templates, fields and submitted reports
-- ---------------------------------------------------------------------------
insert into public.report_templates (id, company_id, segment, name, description, active) values
  ('d000000a-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','construction','Daily Installation Report','End-of-day report for PV installation crews.', true),
  ('d000000a-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','technical_assistance','Electrical Commissioning Sheet','Commissioning checklist for inverters and metering.', true),
  ('d000000a-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','cleaning','Cleaning Shift Report','Per-shift report covering areas, consumables and incidents.', true),
  ('d000000a-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','maintenance','HVAC Maintenance Round','Preventive maintenance round with readings and parts used.', true)
on conflict (id) do nothing;

insert into public.report_template_fields (id, template_id, company_id, key, label, field_type, required, options, display_order, active) values
  -- Belnex — Daily Installation Report
  ('d000000b-0000-4000-8000-000000000101','d000000a-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','panels_installed','Panels installed','number', true, '[]'::jsonb, 1, true),
  ('d000000b-0000-4000-8000-000000000102','d000000a-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','weather','Weather conditions','select', true,'["Clear","Cloudy","Rain","Wind > 40 km/h"]'::jsonb, 2, true),
  ('d000000b-0000-4000-8000-000000000103','d000000a-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','safety_ok','Safety briefing completed','boolean', true, '[]'::jsonb, 3, true),
  ('d000000b-0000-4000-8000-000000000104','d000000a-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','incidents','Incidents / blockers','text', false, '[]'::jsonb, 4, true),
  -- Belnex — Commissioning
  ('d000000b-0000-4000-8000-000000000105','d000000a-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','inverter_serial','Inverter serial','text', true, '[]'::jsonb, 1, true),
  ('d000000b-0000-4000-8000-000000000106','d000000a-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','insulation_mohm','Insulation resistance (MΩ)','number', true, '[]'::jsonb, 2, true),
  ('d000000b-0000-4000-8000-000000000107','d000000a-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','grid_ok','Grid synchronisation OK','boolean', true, '[]'::jsonb, 3, true),
  -- Nordclean
  ('d000000b-0000-4000-8000-000000000201','d000000a-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','areas_done','Areas completed','multiselect', true,'["Offices","Sanitary","Canteen","Loading bay","Warehouse floor"]'::jsonb, 1, true),
  ('d000000b-0000-4000-8000-000000000202','d000000a-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','consumables','Consumables restocked','boolean', true, '[]'::jsonb, 2, true),
  ('d000000b-0000-4000-8000-000000000203','d000000a-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','client_signature','Client signature','signature', false, '[]'::jsonb, 3, true),
  ('d000000b-0000-4000-8000-000000000204','d000000a-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','remarks','Remarks','text', false, '[]'::jsonb, 4, true),
  -- GeoTech
  ('d000000b-0000-4000-8000-000000000301','d000000a-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','units_serviced','Units serviced','number', true, '[]'::jsonb, 1, true),
  ('d000000b-0000-4000-8000-000000000302','d000000a-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','filters_replaced','Filters replaced','number', true, '[]'::jsonb, 2, true),
  ('d000000b-0000-4000-8000-000000000303','d000000a-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','pressure_bar','System pressure (bar)','number', true, '[]'::jsonb, 3, true),
  ('d000000b-0000-4000-8000-000000000304','d000000a-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','follow_up','Follow-up required','boolean', true, '[]'::jsonb, 4, true)
on conflict (id) do nothing;

insert into public.operational_reports (
  id, company_id, template_id, worker_id, team_id, project_id, site_id, client_company_id,
  report_date, starts_at, ends_at, break_minutes, activity, notes, status,
  created_by, submitted_at, reviewed_by, reviewed_at, rejection_reason
) values
  ('d000000c-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d000000a-0000-4000-8000-000000000101',
   'd0000002-0000-4000-8000-000000000104','d0000004-0000-4000-8000-000000000101','d0000006-0000-4000-8000-000000000101',
   'd0000005-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000004',
   current_date - 3, (current_date - 3 + time '08:00')::timestamptz, (current_date - 3 + time '17:00')::timestamptz, 30,
   'Panel mounting — Block A, rows 1 to 6','Mounting rails aligned; two damaged clamps replaced.','approved',
   'd0000002-0000-4000-8000-000000000104', (current_date - 3 + time '17:20')::timestamptz,
   'd0000002-0000-4000-8000-000000000102', (current_date - 2 + time '09:05')::timestamptz, null),

  ('d000000c-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','d000000a-0000-4000-8000-000000000101',
   'd0000002-0000-4000-8000-000000000106','d0000004-0000-4000-8000-000000000101','d0000006-0000-4000-8000-000000000101',
   'd0000005-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000004',
   current_date - 1, (current_date - 1 + time '08:00')::timestamptz, (current_date - 1 + time '16:30')::timestamptz, 30,
   'Cable routing — Block C riser','Rain from 14:00; roof work suspended, continued indoors.','submitted',
   'd0000002-0000-4000-8000-000000000106', (current_date - 1 + time '16:45')::timestamptz, null, null, null),

  ('d000000c-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001','d000000a-0000-4000-8000-000000000102',
   'd0000002-0000-4000-8000-000000000105','d0000004-0000-4000-8000-000000000102','d0000006-0000-4000-8000-000000000102',
   'd0000005-0000-4000-8000-000000000103', null,
   current_date - 5, (current_date - 5 + time '08:00')::timestamptz, (current_date - 5 + time '19:00')::timestamptz, 45,
   'Inverter commissioning — cabin 2','Grid sync achieved on the second attempt after transformer tap adjustment.','approved',
   'd0000002-0000-4000-8000-000000000105', (current_date - 5 + time '19:20')::timestamptz,
   'd0000002-0000-4000-8000-000000000102', (current_date - 4 + time '08:40')::timestamptz, null),

  ('d000000c-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','d000000a-0000-4000-8000-000000000101',
   'd0000002-0000-4000-8000-000000000104','d0000004-0000-4000-8000-000000000101','d0000006-0000-4000-8000-000000000101',
   'd0000005-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000004',
   current_date - 8, (current_date - 8 + time '08:00')::timestamptz, (current_date - 8 + time '17:00')::timestamptz, 30,
   'Panel mounting — Block A, rows 7 to 9','Panel count did not match the delivery note.','changes_requested',
   'd0000002-0000-4000-8000-000000000104', (current_date - 8 + time '17:30')::timestamptz,
   'd0000002-0000-4000-8000-000000000102', (current_date - 7 + time '10:00')::timestamptz,
   'Panel count does not reconcile with delivery note DN-2026-0412. Please recount and resubmit.'),

  ('d000000c-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d000000a-0000-4000-8000-000000000201',
   'd0000002-0000-4000-8000-000000000204','d0000004-0000-4000-8000-000000000201','d0000006-0000-4000-8000-000000000202',
   'd0000005-0000-4000-8000-000000000202', null,
   current_date - 2, (current_date - 2 + time '06:00')::timestamptz, (current_date - 2 + time '14:00')::timestamptz, 30,
   'Morning office circuit — floors 3 to 7','Floor 5 meeting rooms occupied; rescheduled to the next round.','approved',
   'd0000002-0000-4000-8000-000000000204', (current_date - 2 + time '14:10')::timestamptz,
   'd0000002-0000-4000-8000-000000000202', (current_date - 1 + time '07:30')::timestamptz, null),

  ('d000000c-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','d000000a-0000-4000-8000-000000000201',
   'd0000002-0000-4000-8000-000000000205','d0000004-0000-4000-8000-000000000202','d0000006-0000-4000-8000-000000000201',
   'd0000005-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000005',
   current_date - 1, (current_date - 1 + time '06:00')::timestamptz, (current_date - 1 + time '14:30')::timestamptz, 30,
   'Hall 3 industrial scrub and waste removal','Scrubber battery underperforming — maintenance requested.','under_review',
   'd0000002-0000-4000-8000-000000000205', (current_date - 1 + time '14:40')::timestamptz, null, null, null),

  ('d000000c-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d000000a-0000-4000-8000-000000000301',
   'd0000002-0000-4000-8000-000000000304','d0000004-0000-4000-8000-000000000301','d0000006-0000-4000-8000-000000000302',
   'd0000005-0000-4000-8000-000000000301', null,
   current_date - 4, (current_date - 4 + time '08:30')::timestamptz, (current_date - 4 + time '17:30')::timestamptz, 45,
   'Quarterly HVAC round — units 1 to 6','Unit 4 pressure below threshold; follow-up scheduled.','approved',
   'd0000002-0000-4000-8000-000000000304', (current_date - 4 + time '17:45')::timestamptz,
   'd0000002-0000-4000-8000-000000000302', (current_date - 3 + time '09:00')::timestamptz, null),

  ('d000000c-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003','d000000a-0000-4000-8000-000000000301',
   'd0000002-0000-4000-8000-000000000305','d0000004-0000-4000-8000-000000000302','d0000006-0000-4000-8000-000000000303',
   'd0000005-0000-4000-8000-000000000302', null,
   current_date, (current_date + time '08:30')::timestamptz, null, 0,
   'Riverbank survey — sector 4 setup', null,'draft',
   'd0000002-0000-4000-8000-000000000305', null, null, null, null)
on conflict (id) do nothing;

insert into public.operational_report_values (id, report_id, field_id, company_id, value_text, value_number, value_boolean, value_json) values
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000101','d000000b-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001', null, 48, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000101','d000000b-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','Clear', null, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000101','d000000b-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001', null, null, true, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000101','d000000b-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','Two damaged clamps replaced from van stock.', null, null, null),

  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000102','d000000b-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001', null, 26, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000102','d000000b-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','Rain', null, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000102','d000000b-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001', null, null, true, null),

  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000103','d000000b-0000-4000-8000-000000000105','d0000001-0000-4000-8000-000000000001','SMA-STP-110-4821', null, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000103','d000000b-0000-4000-8000-000000000106','d0000001-0000-4000-8000-000000000001', null, 412, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000103','d000000b-0000-4000-8000-000000000107','d0000001-0000-4000-8000-000000000001', null, null, true, null),

  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000104','d000000b-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001', null, 31, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000104','d000000b-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','Cloudy', null, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000104','d000000b-0000-4000-8000-000000000103','d0000001-0000-4000-8000-000000000001', null, null, true, null),

  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000201','d000000b-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002', null, null, null,'["Offices","Sanitary","Canteen"]'::jsonb),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000201','d000000b-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002', null, null, true, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000201','d000000b-0000-4000-8000-000000000204','d0000001-0000-4000-8000-000000000002','Floor 5 meeting rooms occupied, moved to next round.', null, null, null),

  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000202','d000000b-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002', null, null, null,'["Warehouse floor","Loading bay"]'::jsonb),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000202','d000000b-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002', null, null, false, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000202','d000000b-0000-4000-8000-000000000204','d0000001-0000-4000-8000-000000000002','Scrubber battery holds ~40% of rated runtime.', null, null, null),

  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000301','d000000b-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003', null, 6, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000301','d000000b-0000-4000-8000-000000000302','d0000001-0000-4000-8000-000000000003', null, 11, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000301','d000000b-0000-4000-8000-000000000303','d0000001-0000-4000-8000-000000000003', null, 1.8, null, null),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000301','d000000b-0000-4000-8000-000000000304','d0000001-0000-4000-8000-000000000003', null, null, true, null);

insert into public.operational_report_history (id, report_id, company_id, actor_id, action, note, occurred_at) values
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000104','submitted', null, (current_date - 3 + time '17:20')::timestamptz),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000102','approved','Counts reconcile with the delivery note.', (current_date - 2 + time '09:05')::timestamptz),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000104','submitted', null, (current_date - 8 + time '17:30')::timestamptz),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000104','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000102','changes_requested','Panel count does not reconcile with DN-2026-0412.', (current_date - 7 + time '10:00')::timestamptz),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000202','d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000205','submitted', null, (current_date - 1 + time '14:40')::timestamptz),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000304','submitted', null, (current_date - 4 + time '17:45')::timestamptz),
  (gen_random_uuid(),'d000000c-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000302','approved','Unit 4 follow-up logged as a separate work order.', (current_date - 3 + time '09:00')::timestamptz);

-- Export requests (Reports module)
insert into public.reports (id, company_id, requested_by, type, format, status, parameters, file_url, requested_at, completed_at) values
  ('d000000d-0000-4000-8000-000000000101','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000103','payroll_export','xlsx','completed',
   '{"period":"previous_month","include_travel":true}'::jsonb,'https://files.straton.demo/exports/blx-payroll-prev.xlsx', now() - interval '18 days', now() - interval '18 days' + interval '4 minutes'),
  ('d000000d-0000-4000-8000-000000000102','d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000102','timesheet_summary','pdf','completed',
   '{"scope":"team","team":"Solar Installation"}'::jsonb,'https://files.straton.demo/exports/blx-timesheets.pdf', now() - interval '6 days', now() - interval '6 days' + interval '2 minutes'),
  ('d000000d-0000-4000-8000-000000000201','d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000203','payroll_export','csv','pending',
   '{"period":"current_month"}'::jsonb, null, now() - interval '2 hours', null),
  ('d000000d-0000-4000-8000-000000000301','d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000303','cost_analysis','xlsx','completed',
   '{"project":"HVAC Preventive Maintenance"}'::jsonb,'https://files.straton.demo/exports/gtc-cost.xlsx', now() - interval '11 days', now() - interval '11 days' + interval '6 minutes')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 11. Notifications, certificates and professional profiles
-- ---------------------------------------------------------------------------
insert into public.notifications (id, company_id, user_id, type, title, message, action_url, read_at, created_at, metadata) values
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000102','ACTION_REQUIRED','Timesheets awaiting approval','Five weekly timesheets from the Solar Installation team are waiting for your review.','/dashboard/timesheets', null, now() - interval '3 hours','{"count":5}'::jsonb),
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000102','WARNING','Shift over 10 hours detected','Karim Benali logged an 11h15 shift on the Louise MV Cabin site.','/dashboard/finance', null, now() - interval '1 day','{"minutes":675}'::jsonb),
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000103','INFO','Payroll period ready for review','The current payroll period has been consolidated and is ready for review.','/dashboard/finance', now() - interval '2 hours', now() - interval '5 hours','{}'::jsonb),
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000001','d0000002-0000-4000-8000-000000000104','WARNING','Report changes requested','Your installation report of the 8th needs a panel recount before it can be approved.','/dashboard/field-reports', null, now() - interval '7 days','{}'::jsonb),
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000202','ACTION_REQUIRED','Report under review','The Hall 3 shift report flags a scrubber battery fault.','/dashboard/field-reports', null, now() - interval '20 hours','{}'::jsonb),
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000002','d0000002-0000-4000-8000-000000000201','SUCCESS','Monthly payroll closed','Last month''s payroll period was closed and exported to Yuki.','/dashboard/finance', now() - interval '19 days', now() - interval '20 days','{}'::jsonb),
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000302','INFO','Maintenance follow-up required','Unit 4 at Liège Tech Park is below the pressure threshold.','/dashboard/projects', null, now() - interval '3 days','{}'::jsonb),
  (gen_random_uuid(),'d0000001-0000-4000-8000-000000000003','d0000002-0000-4000-8000-000000000303','INFO','Cost analysis export ready','Your cost analysis export for HVAC Preventive Maintenance is available.','/dashboard/reports', now() - interval '10 days', now() - interval '11 days','{}'::jsonb);

insert into public.certificates (id, user_id, name, issuer, issued_at, expires_at, credential_id) values
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000104','VCA Basic Safety','BeSaCC-VCA', current_date - 500, current_date + 1300,'VCA-BE-884512'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000104','Working at Height','Vinçotte', current_date - 300, current_date + 60,'VIN-WAH-22104'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000105','BA5 Electrical Authorisation','Vinçotte', current_date - 420, current_date + 310,'VIN-BA5-77321'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000105','VCA Basic Safety','BeSaCC-VCA', current_date - 410, current_date + 1400,'VCA-BE-884588'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000106','First Aid at Work','Croix-Rouge de Belgique', current_date - 90, current_date + 640,'CRB-FA-51002'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000204','Cleaning Machine Operation','Cleaning Academy BE', current_date - 250, current_date + 480,'CAB-CMO-3391'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000304','HVAC Refrigerant Handling (Cat. I)','Fedarene', current_date - 600, current_date + 130,'FED-RH1-19822'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000305','Land Surveying Licence','Ordre des Géomètres-Experts', current_date - 700, current_date + 800,'OGE-LS-40218');

insert into public.professional_profiles (id, user_id, bio, specialties, languages, availability) values
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000104','Senior technician with nine years in rooftop photovoltaic installation and commissioning.',
   array['Photovoltaic installation','Rooftop safety','Team leadership'], array['pt','fr','en'],'full_time'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000105','Certified electrician specialising in medium-voltage cabins and inverter commissioning.',
   array['Medium voltage','Inverter commissioning','Metering'], array['fr','ar','en'],'full_time'),
  (gen_random_uuid(),'d0000002-0000-4000-8000-000000000305','Survey engineer focused on topographic surveying and structural inspection for civil works.',
   array['Topographic survey','Structural inspection','GIS'], array['fr','en','nl'],'contract');

-- ---------------------------------------------------------------------------
-- 12. Live map — today's check-ins with GPS
-- ---------------------------------------------------------------------------
-- The live map only shows entries started today that carry coordinates. Two
-- workers are deliberately left without a check-in so the "no check-in today"
-- KPI reflects something real instead of always reading zero.
do $$
declare
  w record; site_row record; tsk uuid; i int := 0;
begin
  for w in
    select t.id as timesheet_id, t.company_id, t.user_id, u.name
      from public.timesheets t
      join public.users u on u.id = t.user_id
     where t.company_id::text like 'd0000001-%'
       and t.period_start = date_trunc('week', current_date)::date
     order by t.company_id, u.name
  loop
    i := i + 1;
    continue when i % 5 = 0;

    select id, name, latitude, longitude, project_id into site_row
      from public.sites
     where company_id = w.company_id and status = 'active'
     order by id
     offset (i % greatest((select count(*) from public.sites where company_id = w.company_id and status = 'active'), 1))
     limit 1;
    continue when site_row.id is null;

    select id into tsk from public.tasks
     where company_id = w.company_id and (project_id = site_row.project_id or project_id is null)
     order by id limit 1;

    insert into public.timesheet_entries (
      id, company_id, timesheet_id, project_id, site_id, task_id,
      starts_at, ends_at, break_minutes, notes, status, start_latitude, start_longitude
    ) values (
      gen_random_uuid(), w.company_id, w.timesheet_id, site_row.project_id, site_row.id, tsk,
      (current_date + time '07:45' + (i * interval '7 minutes')),
      (current_date + time '16:30'), 30, 'Check-in on site.', 'draft',
      site_row.latitude  + ((i % 7) - 3) * 0.0015,
      site_row.longitude + ((i % 5) - 2) * 0.0018
    );
  end loop;
end $$;

commit;

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
select 'companies' t, count(*) from public.companies where id::text like 'd0000001-%'
union all select 'users',                 count(*) from public.users                 where id::text like 'd0000002-%'
union all select 'memberships',           count(*) from public.company_memberships   where id::text like 'd0000003-%'
union all select 'employee_records',      count(*) from public.employee_records      where id::text like 'd000000f-%'
union all select 'teams',                 count(*) from public.teams                 where id::text like 'd0000004-%'
union all select 'team_memberships',      count(*) from public.team_memberships      where id::text like 'd0000010-%'
union all select 'projects',              count(*) from public.projects              where id::text like 'd0000006-%'
union all select 'sites',                 count(*) from public.sites                 where id::text like 'd0000005-%'
union all select 'timesheets',            count(*) from public.timesheets            where company_id::text like 'd0000001-%'
union all select 'timesheet_entries',     count(*) from public.timesheet_entries     where company_id::text like 'd0000001-%'
union all select 'payroll_periods',       count(*) from public.payroll_periods       where id::text like 'd0000009-%'
union all select 'payroll_consolidations',count(*) from public.payroll_consolidations where company_id::text like 'd0000001-%'
union all select 'operational_reports',   count(*) from public.operational_reports   where id::text like 'd000000c-%'
union all select 'notifications',         count(*) from public.notifications         where company_id::text like 'd0000001-%'
union all select 'certificates',          count(*) from public.certificates          where user_id::text like 'd0000002-%'
order by 1;
