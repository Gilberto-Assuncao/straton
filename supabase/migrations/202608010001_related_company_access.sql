-- Related-company access
--
-- Closes the gap recorded in docs/02-architecture/DATABASE_ARCHITECTURE.md
-- (found in Sprint 5.8): `companies_read_member` only lets you read a company
-- you are a member of, but `projects.client_company_id` and
-- `sites.client_company_id` legitimately point at companies you are not a
-- member of — clients, contractors, subcontractors. The result was that a
-- project's own client was unreadable, and the UI had to invent a placeholder
-- ("Client information unavailable") so the project would not vanish from the
-- list entirely.
--
-- That gap was deliberately left open rather than patched inside a data-wiring
-- sprint, because widening a security policy deserves its own decision. This
-- migration is that decision.
--
-- Two changes, both scoped as narrowly as the problem allows:
--
--   1. You may read a company you have an active relationship with. You already
--      know it exists — you are contractually linked to it. This does not grant
--      access to its members, timesheets, projects or any other tenant data;
--      every one of those tables keys off is_company_member, which is
--      unchanged.
--
--   2. A client company can be created only together with the relationship that
--      justifies it, in one transaction. There is still no plain INSERT policy
--      on `companies`, so this is the only way to add one — which keeps the
--      table from filling with orphan rows nobody is linked to.

-- ---------------------------------------------------------------------------
-- 1. Read access to related companies
-- ---------------------------------------------------------------------------

-- Defined first because is_related_company below calls it: a fresh database
-- applies this file top to bottom, and the reverse order fails there even
-- though it worked when applied statement by statement against the hosted
-- project. Mirrors
-- private.is_company_member, which is not reachable from a `public.` search
-- path inside another definer function.
create or replace function public.company_membership_exists(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.company_memberships m
    where m.company_id = target_company_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
$$;

-- The parameter is prefixed p_ deliberately: company_relationships has columns
-- named source_company_id and target_company_id, and an unprefixed parameter of
-- the same name is resolved in favour of the column. That turns the comparison
-- into a tautology and makes every company readable — caught here in testing,
-- and the reason the negative control below exists.
--
-- Security definer for the same reason is_company_member is: the check reads
-- company_relationships, which is itself protected by RLS, and a policy that
-- had to satisfy another policy to evaluate would recurse.
create or replace function private.is_related_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.company_relationships r
    where r.status = 'active'
      and (
        (r.target_company_id = p_company_id and public.company_membership_exists(r.source_company_id))
        or (r.source_company_id = p_company_id and public.company_membership_exists(r.target_company_id))
      )
  )
$$;

revoke all on function public.company_membership_exists(uuid) from public;
grant execute on function public.company_membership_exists(uuid) to authenticated;
revoke all on function private.is_related_company(uuid) from public;
grant execute on function private.is_related_company(uuid) to authenticated;

-- Additive: companies_read_member stays exactly as it was. Postgres ORs
-- permissive policies together, so this only ever widens reads to companies
-- already linked by an active relationship.
create policy companies_read_related on public.companies
for select to authenticated
using ((select private.is_related_company(id)));

-- ---------------------------------------------------------------------------
-- 2. Creating a client company
-- ---------------------------------------------------------------------------

create or replace function public.create_client_company(
  owner_company_id uuid,
  display_name_input text,
  relationship_type_input text default 'client',
  legal_name_input text default null,
  registration_number_input text default null,
  vat_number_input text default null,
  country_code_input text default 'BE',
  address_line_1_input text default null,
  postal_code_input text default null,
  city_input text default null,
  email_input text default null,
  phone_input text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  created_id uuid;
  slug_base text;
  slug_value text;
begin
  if actor_id is null then raise exception 'Authentication required'; end if;

  -- Only someone who can already act for the owning company may attach a
  -- client to it. Same role set that governs company_relationships inserts.
  if not exists(
    select 1
    from public.company_memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.roles r on r.id = mr.role_id
    where m.company_id = owner_company_id
      and m.user_id = actor_id
      and m.status = 'active'
      and r.key in ('owner','admin','administrator','manager')
  ) then
    raise exception 'You do not have permission to add a client to this company';
  end if;

  if char_length(trim(coalesce(display_name_input, ''))) not between 2 and 160 then
    raise exception 'Invalid company name';
  end if;
  if relationship_type_input not in ('client','contractor','subcontractor','partner') then
    raise exception 'Invalid relationship type';
  end if;
  if upper(country_code_input) !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code';
  end if;

  -- Reuse the existing row when the enterprise number is already known, so the
  -- same client added from two different sites does not become two companies.
  if nullif(trim(coalesce(registration_number_input, '')), '') is not null then
    select id into created_id
    from public.companies
    where registration_number = trim(registration_number_input)
    limit 1;
  end if;

  if created_id is null then
    slug_base := trim(both '-' from lower(regexp_replace(display_name_input, '[^a-zA-Z0-9]+', '-', 'g')));
    if slug_base = '' then raise exception 'Invalid company name'; end if;
    slug_value := slug_base;
    if exists(select 1 from public.companies where slug = slug_value) then
      slug_value := slug_base || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    end if;

    insert into public.companies (
      name, legal_name, display_name, slug, registration_number, vat_number, vat,
      country_code, country, default_language, timezone, currency,
      address_line_1, postal_code, city, email, phone, status
    ) values (
      display_name_input,
      coalesce(nullif(trim(coalesce(legal_name_input, '')), ''), display_name_input),
      display_name_input, slug_value,
      nullif(trim(coalesce(registration_number_input, '')), ''),
      nullif(trim(coalesce(vat_number_input, '')), ''),
      nullif(trim(coalesce(vat_number_input, '')), ''),
      upper(country_code_input), upper(country_code_input),
      'en', 'Europe/Brussels', 'EUR',
      nullif(trim(coalesce(address_line_1_input, '')), ''),
      nullif(trim(coalesce(postal_code_input, '')), ''),
      nullif(trim(coalesce(city_input, '')), ''),
      nullif(trim(coalesce(email_input, '')), ''),
      nullif(trim(coalesce(phone_input, '')), ''),
      'active'
    ) returning id into created_id;
  end if;

  -- The relationship is what makes the company readable, so it is created in
  -- the same transaction as the company itself — never one without the other.
  insert into public.company_relationships (
    source_company_id, target_company_id, relationship_type, status
  ) values (
    owner_company_id, created_id, relationship_type_input::public.relationship_type, 'active'
  )
  on conflict (source_company_id, target_company_id) do nothing;

  return created_id;
end;
$$;

revoke all on function public.create_client_company(uuid,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.create_client_company(uuid,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
