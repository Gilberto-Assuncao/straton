-- Support access to a customer's data, without weakening anything (#19).
--
-- The problem: when a customer calls, the only way to see what they see is to
-- ask for their password. That is the wrong answer to a support call.
--
-- The dangerous fix is the obvious one — give the platform owner a company role
-- everywhere, or loosen `private.is_company_member`. Both grant blanket access
-- disguised as tenancy, and the first also puts a fake member in the customer's
-- own People list. Neither happens here: **no policy in this database is
-- widened by this migration.** Every table stays exactly as strict as it was.
--
-- What is added instead:
--
--   1. A privilege that is not a company role and can never be implied by one.
--   2. A session that has to be opened deliberately, names the company, and
--      expires.
--   3. A row in the customer's own audit log saying it happened.
--
-- Reading the data is the application's job, through the service role, scoped
-- to the one company the session names — see `src/features/support/`. That is
-- the only path, and it is read-only by decision (the owner's, on 2026-08-30):
-- editing a customer's records as support is a different responsibility, and
-- the customer is the controller of that data, not us.

/**
 * Who may open a support session.
 *
 * A table rather than a flag on `users`, for two reasons. A column is edited in
 * place and leaves no record of who granted what and when; and a privilege
 * column on `users` is one careless `select *` away from an admin screen that
 * displays it.
 *
 * Managed from the database, not from the product. There is deliberately no
 * screen that grants this, because a screen that grants it is a screen that can
 * be tricked into granting it.
 */
create table if not exists public.platform_admins (
  user_id uuid primary key references public.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references public.users (id) on delete set null,
  /** Why this person has it. Read by a human, months later, deciding to revoke. */
  note text
);

alter table public.platform_admins enable row level security;

-- No policy for `authenticated`, on purpose, and therefore no grant either.
-- Nobody reads this list through the API — not even the people on it. The one
-- question the application is allowed to ask is "am I on it?", and
-- `is_platform_admin()` below answers that about the caller and nobody else.
grant select, insert, update, delete on public.platform_admins to service_role;

/**
 * Am *I* a platform admin?
 *
 * Security definer because the table is unreadable by design. It answers only
 * about the caller: there is no argument, so it cannot be used to enumerate who
 * else has the privilege.
 */
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  )
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_platform_admin() to service_role;

/**
 * One session: who looked, at which company, and when it stops.
 *
 * Time-limited because support access that never ends is not support access, it
 * is a second set of keys. Thirty minutes is long enough for a phone call and
 * short enough that forgetting to close it is not a standing grant.
 *
 * `ended_at` is set when the session is closed by hand. A session is usable
 * only while it is neither ended nor expired, and that check lives in
 * `src/features/support/session.ts` where it can be tested against a clock.
 */
create table if not exists public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  constraint support_sessions_expiry_after_start check (expires_at > started_at)
);

create index if not exists support_sessions_admin_idx on public.support_sessions (admin_user_id, started_at desc);
create index if not exists support_sessions_company_idx on public.support_sessions (company_id, started_at desc);

alter table public.support_sessions enable row level security;

-- Same shape as above: the application reaches this through the service role
-- and nobody reaches it through a policy. The customer does not read this table
-- either — they read the audit entry, which is written into their own company's
-- log and which their existing policies already let them see.
grant select, insert, update on public.support_sessions to service_role;
