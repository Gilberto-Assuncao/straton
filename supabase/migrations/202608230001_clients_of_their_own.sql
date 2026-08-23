-- A client can be a person (#85).
--
-- `sites.client_company_id` pointed at `companies`, so a client *was* a
-- registered company, necessarily. For an electrical or cleaning firm in
-- Brussels that is wrong in most jobs: the client is the owner of the house,
-- not a company with a VAT number.
--
-- The cheap fix was a flag on `companies` — `is_individual`, and six columns
-- that mean nothing when it is set. That spreads "if this is a person, ignore
-- these fields" through every screen, and leaves the table meaning two things.
--
-- The real problem is that "client" and "company registered in the system" were
-- treated as one thing and are not. A private client will never have an account
-- here; a partner company that uses STRATON is not a client. So clients get a
-- table of their own, and a *company* client keeps its `companies` row and is
-- linked to it — which is where the VAT number, the legal form and the
-- registered office belong, and where the CBE lookup already writes them.
--
-- `operational_reports.client_company_id` is deliberately left alone. That
-- column records which company a report was made for at the moment it was
-- submitted; it is a different question from who the client of a site is, and
-- widening it is not what this issue asked for.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  /** Whose client this is — the company using STRATON, not the client itself. */
  company_id uuid not null references public.companies (id) on delete cascade,

  kind text not null check (kind in ('individual', 'company')),

  /**
   * What this client is called on screen.
   *
   * Held here even for a company client, where `companies.name` also has it.
   * The duplication is deliberate and narrow: this is the label the site list
   * and the picker read, and a firm that knows a client as "Dupont — villa
   * Uccle" should be able to say so without renaming a company that other
   * companies on the platform can see.
   */
  name text not null,

  -- Contact and address for a person. A company client keeps these on its
  -- `companies` row, which is where the CBE lookup fills them in.
  email text,
  phone text,
  address jsonb not null default '{}',

  /** The registered entity, when the client is one. */
  linked_company_id uuid references public.companies (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint clients_name_present check (length(btrim(name)) > 1),
  -- A person has no company behind them, and a company client has one. Without
  -- both halves the kind is a label rather than a fact, and the billing
  -- question this table exists to answer — person or company, which changes the
  -- VAT treatment — goes back to being a guess.
  constraint clients_individual_has_no_company check (kind <> 'individual' or linked_company_id is null),
  constraint clients_company_has_one check (kind <> 'company' or linked_company_id is not null)
);

create index if not exists clients_company_idx on public.clients (company_id, name);

-- One client row per registered company, per firm. Two would put the same
-- client in the picker twice and split its sites between them.
create unique index if not exists clients_one_per_linked_company
  on public.clients (company_id, linked_company_id)
  where linked_company_id is not null;

alter table public.clients enable row level security;

-- Explicit, not inherited from Supabase's default privileges — see the note in
-- 202608010004 and the sweep in tests/rls/grants.test.ts.
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.clients to service_role;

/**
 * Your own clients, and nobody else's.
 *
 * Narrower than `sites`, which a partner company can read once it accepts an
 * allocation. A client list is the customer book: who a firm works for, and
 * what it calls them. A subcontractor standing on one of their sites has no
 * business reading it.
 */
drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients
for select to authenticated
using ((select private.is_company_member(company_id)));

drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients
for insert to authenticated
with check ((select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor'])));

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
for update to authenticated
using ((select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor'])))
with check ((select private.has_company_role(company_id, array['owner', 'admin', 'administrator', 'manager', 'supervisor'])));

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
for delete to authenticated
using ((select private.is_company_admin(company_id)));

-- ---------------------------------------------------------------------------
-- Sites point at clients, not at companies
-- ---------------------------------------------------------------------------

alter table public.sites add column if not exists client_id uuid references public.clients (id) on delete set null;
create index if not exists sites_client_idx on public.sites (client_id);

-- Every company that was already a client of somebody becomes a client row for
-- that somebody. `distinct` because a firm usually has several sites for the
-- same client, and the unique index above would refuse the second.
insert into public.clients (company_id, kind, name, linked_company_id)
select distinct s.company_id, 'company', c.name, s.client_company_id
from public.sites s
join public.companies c on c.id = s.client_company_id
where s.client_company_id is not null
on conflict do nothing;

update public.sites s
set client_id = cl.id
from public.clients cl
where cl.company_id = s.company_id
  and cl.linked_company_id = s.client_company_id
  and s.client_company_id is not null;

-- Dropped rather than left in place. A column that still exists is a column
-- something writes to, and two answers to "who is the client of this site" is
-- the state this migration exists to end.
alter table public.sites drop column if exists client_company_id;
