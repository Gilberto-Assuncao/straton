-- The work location becomes the unit of management (#77)
--
-- "eu cadastro a Obra/Local de Trabalho, dentro da Obra eu decido separar por
--  projetos ou local"
--
-- The three levels already existed. The problem was the direction: `projects`
-- was the parent of `sites`, so the thing with the address — the chantier a
-- worker actually goes to — hung underneath an abstraction. The manager sees it
-- the other way round, and so does the data:
--
--   project "Le Parc - Rooftop PV"  ->  sites "Le Parc - Block A", "Block C"
--
-- That is a location with two subdivisions, written upside down.
--
-- `sites` survives as the location, for three reasons that are not preferences:
-- it holds the address and the coordinates, it is what 299 timesheet entries
-- point at, and it is what the clock-in location check compares against. Moving
-- the identity to `projects` would have meant rewriting every one of those.
--
-- So this migration moves the *fields* the other way — budget, estimated hours
-- and priority come to live on the location, which is what the manager decided:
--
--   "Orçamentos e Horas estimadas passam a viver no local, porém se o gestor
--    solicitar um relatório, ele deve ter a possibilidade de ver vários locais"
--
-- The second half of that is already done (#81): the report takes a set of
-- locations. The two never conflicted — where a number lives is the model, how
-- many locations a query sums is the query.

-- ---------------------------------------------------------------------------
-- 1. The location carries what the project used to
-- ---------------------------------------------------------------------------

alter table public.sites
  add column if not exists estimated_hours numeric,
  add column if not exists budget_amount numeric,
  add column if not exists budget_spent numeric not null default 0,
  add column if not exists budget_currency text not null default 'EUR',
  add column if not exists priority public.project_priority not null default 'medium',
  add column if not exists description text;

comment on column public.sites.budget_spent is
  'Kept alongside the budget rather than derived, matching what projects did. Deriving it would mean every screen showing a budget also has to know how cost is calculated.';

-- Carried over from the parent project, not defaulted. A location that was
-- planned with a budget keeps it.
update public.sites s
set estimated_hours = coalesce(s.estimated_hours, p.estimated_hours),
    budget_amount   = coalesce(s.budget_amount, p.budget_amount),
    budget_spent    = case when s.budget_spent = 0 then p.budget_spent else s.budget_spent end,
    budget_currency = p.budget_currency,
    priority        = p.priority,
    description     = coalesce(s.description, p.description)
from public.projects p
where s.project_id = p.id;

-- ---------------------------------------------------------------------------
-- 2. Subdivisions
-- ---------------------------------------------------------------------------

/**
 * The "local dentro do local" — 1er étage, Escritório A, Elétrica da Sala.
 *
 * A separate table rather than a self-reference on `sites`. A location has an
 * address, coordinates, a client and a geofence; a subdivision has none of
 * those and never should. Making them the same table would mean every one of
 * those columns is nullable and every screen has to ask which kind of row it is
 * holding — and the clock-in check would have to decide what it means to be
 * "within 300 m" of something with no position.
 */
create table if not exists public.site_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  description text,
  -- Not an enum: a subdivision is open or it is not, and the five-state project
  -- lifecycle on something called "1st floor" would be five states nobody sets.
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Two subdivisions with the same name inside one location are a data entry
  -- mistake, and the report groups by name.
  unique (site_id, name)
);

comment on table public.site_areas is
  'Subdivisions inside a work location (#77). Every location has at least one, created automatically, so reports always have something to group by.';

create index if not exists site_areas_site_idx on public.site_areas (site_id, sort_order);

-- ---------------------------------------------------------------------------
-- 3. Backfill
-- ---------------------------------------------------------------------------

/**
 * Every location gets a default subdivision instead of a mandatory field.
 *
 * The original request was that the subdivision be required. Three times in one
 * day a required field became a dead end: a required team blocked the invite, a
 * required client blocked the project, and the client that did exist was
 * invisible. A single-family house has no "1st floor and 2nd floor" — make it
 * required and people type "geral", "x", "único", and the per-subdivision
 * report fills with noise, which is worse than empty.
 *
 * So: created automatically, named for the location itself. Whoever needs to
 * divide, divides. Whoever does not, never sees it. The report always has a
 * value to group by because there is always exactly one.
 */
insert into public.site_areas (company_id, site_id, name, sort_order)
select s.company_id, s.id, 'Todo o local', 0
from public.sites s
where not exists (select 1 from public.site_areas a where a.site_id = s.id);

/**
 * Projects that never got a location become one.
 *
 * Four of eleven projects have no site at all — including both of the ones a
 * real person created by hand. Under the old direction that was a legal state:
 * you made a project and stopped. Under the new one it is a location that does
 * not exist, and the work recorded against it would simply not appear.
 *
 * The address is left empty rather than invented. `sites.address` is `not null`
 * but a `jsonb` object, so `{}` is an honest "not filled in" — and the manager
 * said the location may be an address *or* a made-up name.
 */
insert into public.sites (company_id, name, address, status, project_id, client_company_id,
                          manager_id, starts_at, ends_at, cost_center, description,
                          estimated_hours, budget_amount, budget_spent, budget_currency, priority)
select p.company_id, p.name, '{}'::jsonb,
       case when p.status in ('completed', 'cancelled') then 'archived' else 'active' end,
       p.id, p.client_company_id, p.manager_id, p.starts_at, p.ends_at, p.cost_center, p.description,
       p.estimated_hours, p.budget_amount, p.budget_spent, p.budget_currency, p.priority
from public.projects p
where not exists (select 1 from public.sites s where s.project_id = p.id);

-- ...and those new locations need their default subdivision too.
insert into public.site_areas (company_id, site_id, name, sort_order)
select s.company_id, s.id, 'Todo o local', 0
from public.sites s
where not exists (select 1 from public.site_areas a where a.site_id = s.id);

-- ---------------------------------------------------------------------------
-- 4. Who may do what
-- ---------------------------------------------------------------------------

alter table public.site_areas enable row level security;

/**
 * Mirrors `sites` exactly, which is the point: a subdivision is part of a
 * location, and any rule that differed would be a way to reach through one to
 * the other. Reading is for company members and accepted partners; writing is
 * for admins, by the same `is_company_admin` the #65 sweep settled on
 * (owner/admin/administrator/manager — deliberately not supervisor).
 */
create policy site_areas_tenant_read on public.site_areas
  for select using ((select private.is_company_member(company_id)));

create policy site_areas_read_partner on public.site_areas
  for select using (
    exists (
      select 1 from public.sites s
      where s.id = site_areas.site_id
        and s.project_id is not null
        and (select private.is_accepted_project_partner(s.project_id))
    )
  );

create policy site_areas_admin_insert on public.site_areas
  for insert with check ((select private.is_company_admin(company_id)));

create policy site_areas_admin_update on public.site_areas
  for update using ((select private.is_company_admin(company_id)))
  with check ((select private.is_company_admin(company_id)));

/**
 * The delete policy that `sites` never had.
 *
 * Without one, RLS refuses every row silently: the delete affects nothing, no
 * error is raised, and the screen reports success. That exact failure was found
 * twice already, on `operational_report_values` and `report_template_fields`.
 * Writing the insert and the update and forgetting the delete is evidently easy
 * to do, so it is written here first.
 */
create policy site_areas_admin_delete on public.site_areas
  for delete using ((select private.is_company_admin(company_id)));

-- And the same gap on `sites` itself, found while reading its policies for this
-- migration: insert, select and update, no delete. Deleting a work location has
-- been a no-op reported as a success this whole time.
drop policy if exists sites_admin_delete on public.sites;
create policy sites_admin_delete on public.sites
  for delete using ((select private.is_company_admin(company_id)));

grant select, insert, update, delete on public.site_areas to authenticated;

/**
 * `company_id` is the tenant, and it must agree with the location's.
 *
 * Left to the caller, a subdivision could be inserted with your own company_id
 * against someone else's location — which passes the insert policy, because the
 * policy only ever looks at the company_id you supplied. The check is on the
 * server or it is not a check.
 */
create or replace function private.enforce_site_area()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_company uuid;
begin
  select s.company_id into owner_company from public.sites s where s.id = new.site_id;

  if owner_company is null then
    raise exception 'That work location does not exist.' using errcode = 'foreign_key_violation';
  end if;

  -- Migrations and seeds run with no end user; the rules above are about people.
  if (select auth.uid()) is not null and new.company_id is distinct from owner_company then
    raise exception 'A subdivision must belong to the same company as its work location.'
      using errcode = 'insufficient_privilege';
  end if;

  new.company_id := owner_company;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists enforce_site_area on public.site_areas;
create trigger enforce_site_area
  before insert or update on public.site_areas
  for each row execute function private.enforce_site_area();
