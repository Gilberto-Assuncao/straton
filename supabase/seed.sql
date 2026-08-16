-- Development-only deterministic tenant data. Auth users are created through Supabase Auth tooling.
insert into public.roles (key,name,system) values ('owner','Owner',true),('administrator','Administrator',true),('manager','Manager',true),('supervisor','Supervisor',true),('employee','Employee',true),('contractor','Contractor',true),('accountant','Accountant',true) on conflict(key) do nothing;
insert into public.permissions (key,resource,action) values ('projects.read','projects','read'),('projects.manage','projects','manage'),('timesheets.read','timesheets','read'),('timesheets.submit','timesheets','submit'),('timesheets.approve','timesheets','approve'),('reports.read','reports','read'),('finance.read','finance','read'),('company.manage','company','manage') on conflict(key) do nothing;
insert into public.companies (id,name,vat,website,country,city,email,street_address,postal_code,establishment_number,activity_start_date) values
    ('00000000-0000-4000-8000-000000000001','BELNEX ENERGY','BE1038194067','https://belnexenergy.be','Belgium','Grimbergen','contact@belnexenergy.be','Coppendries 3, bus 2','1852','2.389.195.023','2026-07-01'),
    ('00000000-0000-4000-8000-000000000002','GeoTech','BE-DEMO-002',null,'Belgium','Liège',null,null,null,null,null)
on conflict(id) do update set vat=excluded.vat, website=excluded.website, city=excluded.city, email=excluded.email, street_address=excluded.street_address, postal_code=excluded.postal_code, establishment_number=excluded.establishment_number, activity_start_date=excluded.activity_start_date;
insert into public.company_relationships (source_company_id,target_company_id,relationship_type) values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','contractor') on conflict do nothing;
insert into public.tasks (id,company_id,name,status) values ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000001','Site inspection','active') on conflict(id) do nothing;
insert into public.teams (id,company_id,name,description,status) values ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000001','Field Operations','Electrical and HVAC installation crews.','active') on conflict(id) do nothing;
insert into public.sites (id,company_id,client_company_id,name,address,latitude,longitude,status) values ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','GeoTech Main Site','{"city":"Liège","country":"Belgium"}',50.6326,5.5797,'open') on conflict(id) do update set latitude=excluded.latitude, longitude=excluded.longitude;

insert into auth.users (
    instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    confirmation_token,recovery_token,email_change,email_change_token_new,
    email_change_token_current,phone_change,phone_change_token,
    reauthentication_token,raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001001','authenticated','authenticated','admin@straton.local',crypt('straton-local-only',gen_salt('bf')),now(),'','','','','','','','','{"provider":"email","providers":["email"]}','{"name":"Demo Administrator"}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001002','authenticated','authenticated','supervisor@straton.local',crypt('straton-local-only',gen_salt('bf')),now(),'','','','','','','','','{"provider":"email","providers":["email"]}','{"name":"Demo Supervisor"}',now(),now()),
('00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000001003','authenticated','authenticated','employee@straton.local',crypt('straton-local-only',gen_salt('bf')),now(),'','','','','','','','','{"provider":"email","providers":["email"]}','{"name":"Demo Employee"}',now(),now()) on conflict(id) do nothing;
insert into public.users (id,name,email,country) values
('00000000-0000-4000-8000-000000001001','Demo Administrator','admin@straton.local','Belgium'),
('00000000-0000-4000-8000-000000001002','Demo Supervisor','supervisor@straton.local','Belgium'),
('00000000-0000-4000-8000-000000001003','Demo Employee','employee@straton.local','Belgium') on conflict(id) do nothing;
insert into public.company_memberships (
    id,
    company_id,
    user_id,
    job_title,
    function_name,
    status
)
select
    v.id,
    v.company_id,
    v.user_id,
    v.job_title,
    v.function_name,
    v.status
from (
    values
        (
            '00000000-0000-4000-8000-000000002001'::uuid,
            '00000000-0000-4000-8000-000000000001'::uuid,
            '00000000-0000-4000-8000-000000001001'::uuid,
            'Administrator',
            'Operations',
            'active'::membership_status
        ),
        (
            '00000000-0000-4000-8000-000000002002'::uuid,
            '00000000-0000-4000-8000-000000000001'::uuid,
            '00000000-0000-4000-8000-000000001002'::uuid,
            'Supervisor',
            'Field Operations',
            'active'::membership_status
        ),
        (
            '00000000-0000-4000-8000-000000002003'::uuid,
            '00000000-0000-4000-8000-000000000001'::uuid,
            '00000000-0000-4000-8000-000000001003'::uuid,
            'Technician',
            'Field Operations',
            'active'::membership_status
        )
) AS v(
    id,
    company_id,
    user_id,
    job_title,
    function_name,
    status
)
where not exists (
    select 1
    from public.company_memberships m
    where m.company_id = v.company_id
      and m.user_id = v.user_id
      and m.status in ('invited','active','suspended')
);
insert into public.membership_roles (membership_id,role_id) select '00000000-0000-4000-8000-000000002001',id from public.roles where key='administrator' on conflict do nothing;
-- Also grant 'owner' to the demo admin so it passes every owner-only check
-- (e.g. archive/reactivate company) in addition to the administrator-level
-- actions it already had — full unrestricted access for this account.
insert into public.membership_roles (membership_id,role_id) select '00000000-0000-4000-8000-000000002001',id from public.roles where key='owner' on conflict do nothing;
insert into public.membership_roles (membership_id,role_id) select '00000000-0000-4000-8000-000000002002',id from public.roles where key='supervisor' on conflict do nothing;
insert into public.membership_roles (membership_id,role_id) select '00000000-0000-4000-8000-000000002003',id from public.roles where key='employee' on conflict do nothing;
insert into public.employee_records (company_id,company_membership_id,job_title,employment_type,employment_status,start_date) values
    ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000002001','Administrator','employee','active','2025-01-06'),
    ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000002002','Supervisor','employee','active','2025-03-10'),
    ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000002003','Technician','employee','active','2025-06-01')
on conflict (company_membership_id) do nothing;
insert into public.timesheets (id,company_id,user_id,period_start,period_end,status,submitted_at) values ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000001003','2026-07-13','2026-07-19','submitted',now()) on conflict(id) do nothing;
insert into public.timesheet_entries (company_id,timesheet_id,site_id,starts_at,ends_at,break_minutes,notes) values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000201','2026-07-13 08:00:00+02','2026-07-13 16:30:00+02',30,'Development seed entry');
