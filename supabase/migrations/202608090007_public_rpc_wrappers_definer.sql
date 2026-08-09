-- Creating a team, editing a team, and creating a company all failed.
--
-- Reported from production: "Não consigo adicionar uma equipe", with the
-- generic "could not create the team" on screen. The cause is not the form and
-- not the caller's roles.
--
-- `public.create_team` is a thin wrapper that calls `private.create_team`, and
-- the wrapper is SECURITY INVOKER. `authenticated` has no USAGE on the
-- `private` schema, so resolving the inner name fails before any of the
-- function's own logic runs:
--
--   select public.create_team(…) as the real account (owner + manager, active)
--   -> ERROR: permission denied for schema private
--
-- The same wrapper shape covers `update_team` and `create_company`, and both
-- fail identically. `create_company` is the worst of the three: it is the
-- onboarding path, so a new customer could not create their company at all.
--
-- This never showed up in a policy because a policy stores the function by OID
-- and resolves nothing at run time. A SQL function body does resolve names, as
-- the invoker. Nothing in the test suite called these RPCs, so CI stayed green
-- over a feature that could not work.
--
-- The fix is the smallest one that exists: let the wrapper resolve the name.
-- Authorization is unchanged — every `private.*` function here is already
-- SECURITY DEFINER and does its own checking against `auth.uid()`, which reads
-- the JWT claim and is not affected by whose rights the function runs with.
--
-- Not `grant usage on schema private to authenticated`, which would fix the
-- symptom by making every private helper directly callable by anyone logged in.

create or replace function public.create_team(
  company_id_input uuid,
  name_input text,
  description_input text,
  leader_membership_id_input uuid default null,
  status_input public.team_status default 'active',
  color_input text default null,
  icon_input text default null,
  member_ids_input uuid[] default '{}'
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.create_team(
    company_id_input, name_input, description_input,
    leader_membership_id_input, status_input, color_input,
    icon_input, member_ids_input
  );
$$;

create or replace function public.update_team(
  team_id_input uuid,
  name_input text,
  description_input text,
  leader_membership_id_input uuid,
  status_input public.team_status,
  color_input text,
  icon_input text
)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.update_team(
    team_id_input, name_input, description_input,
    leader_membership_id_input, status_input, color_input, icon_input
  );
$$;

create or replace function public.create_company(
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
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select private.create_company(
    legal_name_input, display_name_input, country_code_input,
    default_language_input, timezone_input, currency_code_input,
    registration_number_input, vat_number_input, email_input,
    phone_input, city_input, website_input
  );
$$;

/**
 * The fourth copy of the language list.
 *
 * `private.create_company` accepted only ('en','fr','nl','de','pt') — the same
 * five-language list that the settings form and its validator had, and that
 * they were just moved off. Left alone it would have refused every company
 * created in Polish, Romanian, Spanish, Italian or Brazilian Portuguese, and
 * done it from inside the database where the form could not explain why.
 *
 * Compared case-insensitively because the app lowercases the field before
 * sending it, and `pt-BR` does not survive that.
 */
create or replace function private.create_company(
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
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  company_id_created uuid;
  membership_id_created uuid;
  owner_role_id uuid;
  slug_base text;
  slug_value text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;
  if char_length(trim(legal_name_input)) not between 2 and 160
    or char_length(trim(display_name_input)) not between 2 and 160 then raise exception 'Invalid company name'; end if;
  if upper(country_code_input) !~ '^[A-Z]{2}$' or upper(currency_code_input) !~ '^[A-Z]{3}$' then raise exception 'Invalid localization code'; end if;
  if lower(default_language_input) not in ('en', 'pt', 'pt-br', 'fr', 'nl', 'de', 'pl', 'ro', 'es', 'it')
    or char_length(trim(timezone_input)) < 3 then raise exception 'Invalid localization settings'; end if;
  if email_input is not null and email_input <> '' and email_input !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid company email'; end if;
  if website_input is not null and website_input <> '' and website_input !~* '^https?://' then raise exception 'Invalid company website'; end if;

  slug_base := trim(both '-' from lower(regexp_replace(display_name_input, '[^a-zA-Z0-9]+', '-', 'g')));
  if slug_base = '' then raise exception 'Invalid company name'; end if;
  slug_value := slug_base;
  if exists(select 1 from public.companies where slug = slug_value) then
    slug_value := slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  insert into public.companies (
    name, legal_name, display_name, slug, registration_number, vat_number,
    vat, country_code, country, default_language, timezone, currency,
    phone, email, city, website, status
  ) values (
    display_name_input, legal_name_input, display_name_input, slug_value,
    nullif(registration_number_input, ''), nullif(vat_number_input, ''),
    nullif(vat_number_input, ''), upper(country_code_input), upper(country_code_input),
    default_language_input, timezone_input, upper(currency_code_input),
    nullif(phone_input, ''), nullif(email_input, ''), nullif(city_input, ''),
    nullif(website_input, ''), 'active'
  ) returning id into company_id_created;

  insert into public.company_memberships (
    company_id, user_id, status, starts_at, joined_at, job_title, function_name
  ) values (
    company_id_created, actor_id, 'active', now(), now(), 'Owner', 'owner'
  ) returning id into membership_id_created;

  select id into owner_role_id from public.roles where key = 'owner';
  if owner_role_id is null then raise exception 'Owner role is not configured'; end if;
  insert into public.membership_roles(membership_id, role_id)
  values (membership_id_created, owner_role_id);

  insert into public.company_settings(company_id) values(company_id_created)
  on conflict(company_id) do nothing;

  return company_id_created;
end;
$$;
