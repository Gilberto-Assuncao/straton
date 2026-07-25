# Sprint 3.9.1 — Database Validation

## Status

**BLOQUEADA POR AMBIENTE EXTERNO.** Static analysis and application validation were completed. Clean-database execution, RLS scenarios, role scenarios, transactional rollback, and manual application flows were not executed because Docker, Supabase CLI, PostgreSQL/`psql`, and a controlled remote development project were unavailable.

## Objective and safety boundary

Validate migrations, PostgreSQL integrity, Supabase RLS, RPCs, triggers, and Multi-Tenant isolation without using production or shared data. No secret value was read, logged, or written. No commit, push, reset, restore, or product feature was performed.

## Environment and tools

- Repository branch: `main`, aligned with `origin/main` at `a73ef88` when validation started.
- Supabase configuration: `supabase/config.toml`, project id `straton`, PostgreSQL target `17`.
- Seed: `supabase/seed.sql`, development-only deterministic data.
- Supabase CLI: not installed; `npx supabase --version` could not initialize in the restricted environment.
- Docker: not installed or unavailable on `PATH`.
- PostgreSQL/`psql`: not installed or unavailable on `PATH`.
- Node.js: `24.18.0`.
- npm: `11.16.0`.
- Next.js: `16.2.10`.
- TypeScript: `5.9.3`.

## Environment variables

The documented variables are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `APP_URL`. Only placeholders exist in `.env.example`; no local environment file was present. `.gitignore` ignores `.env*` while explicitly retaining `.env.example`.

The URL and anon key are public client configuration. The service-role key is read only by server-side infrastructure and was not found in Client Components, responses, logs, or documentation. Service role must never be used to bypass failures in user-facing RLS flows.

## Migration review

| Migration | Static result | Runtime result | Main objects and changes |
| --- | --- | --- | --- |
| `202607190001_saas_foundation.sql` | Approved with observations | Not executed | Core users, companies, memberships, RBAC, projects, chantiers, timesheets, reports, settings, storage buckets, tenant helper, base RLS |
| `202607190002_workforce_membership_status.sql` | Approved | Not executed | Adds `inactive`, `left`, and `rejected` to `membership_status` in an isolated transaction |
| `202607190003_workforce_foundation.sql` | Corrected forward-only | Not executed | Workforce enums, employee records, teams, team memberships, role helper, validation trigger, RLS |
| `202607190004_auth_multi_tenant_foundation.sql` | Approved with observations | Not executed | Auth-user synchronization trigger and self-service RLS policies |
| `202607190005_company_management.sql` | Approved after prior stabilization | Not executed | Company profile/settings, constraints, timestamps, restricted policies, `create_company` RPC |
| `202607190006_team_management.sql` | Approved after prior stabilization | Not executed | Team metadata, validations, restricted policies, `create_team` and transactional `update_team` RPCs |
| `202607190007_database_integrity_validation.sql` | Added as forward-only correction | Not executed | Tenant-key immutability, workforce tenant validation, team membership identity and deferred leader consistency |

The chronological dependencies are coherent: the enum extension is committed before later enum use; Company Management depends on Workforce role helpers; Team Management depends on Workforce tables and the Company Management timestamp helper. No migration was deleted, renamed, or rewritten during this validation.

## Resulting schema reviewed

Core entities include `users`, `professional_profiles`, `companies`, `company_memberships`, `roles`, `permissions`, `role_permissions`, `membership_roles`, `company_relationships`, `projects`, `chantiers`, `timesheets`, `timesheet_entries`, `reports`, `notifications`, `certificates`, `audit_logs`, `localization_settings`, `user_settings`, `company_settings`, `employee_records`, `teams`, and `team_memberships`.

Enums reviewed: `membership_status`, `relationship_type`, `project_status`, `timesheet_status`, `notification_type`, `employment_type`, `employment_status`, `cost_visibility`, `team_status`, and `team_role`. Their values are compatible with the current TypeScript unions and form allow-lists found in the repository.

## Constraints, foreign keys, and indexes

Static review confirmed primary keys, current-membership uniqueness, active team-membership uniqueness, valid employment dates/hours, team membership dates, company status/localization formats, team color/archive consistency, and positive time-entry ranges. Foreign keys preserve the declared relationships and historical `SET NULL` paths; several foundation entities still use `CASCADE`, which is safe only while physical DELETE remains unavailable to ordinary authenticated roles.

Indexes reviewed cover active membership lookup, tenant lookup for operational tables, company status, employee/company, team/company, active team links, team status/update ordering, and audit chronology. The correction adds one active leader per team. No speculative indexes were added.

Static analysis found that `employee_records.company_membership_id` and `manager_membership_id` could reference another tenant, and that several tenant keys were mutable. The corrective migration adds database triggers for these invariants. It also prevents changing the identity of a team membership.

## Functions, RPCs, and triggers

Reviewed functions include `private.is_company_member`, `private.has_company_role`, timestamp and tenant validators, `public.handle_new_auth_user`, `public.create_company`, `public.create_team`, and `public.update_team`. Every SECURITY DEFINER function explicitly sets an empty `search_path`; public RPC grants are restricted to `authenticated`; inputs and authenticated membership/role are checked.

`update_team` performs the team update, old-leader demotion, and new-leader update/insert in one PostgreSQL function call, so an exception rolls back the transaction. Runtime rollback was not executed. The correction adds deferred consistency triggers so a leader must end the transaction as the unique active `leader` link in the same team, while preserving the valid multi-statement RPC sequence.

Triggers reviewed cover auth-user synchronization, `updated_at`, cross-company team membership, active operational membership, leader company validation, tenant-key immutability, workforce tenant consistency, and deferred team-leader consistency. The two pre-existing team membership validators are complementary: one enforces structural tenant consistency and the later one adds active/non-archived operational rules.

## RLS and policies

RLS is enabled for all public tables created by the foundation and explicitly for `employee_records`, `teams`, and `team_memberships`. Reviewed policies include:

- `companies`: member SELECT; Owner/Admin update.
- `company_memberships`: own SELECT plus shared-company SELECT.
- `company_settings`: tenant SELECT; Owner/Admin INSERT and UPDATE; no DELETE.
- `employee_records`: tenant SELECT; authorized INSERT and UPDATE; no DELETE.
- `teams`: tenant SELECT; authorized INSERT and UPDATE; no DELETE.
- `team_memberships`: tenant SELECT; authorized INSERT and UPDATE; no DELETE.
- `users`: self SELECT plus active shared-company SELECT.
- `roles`, `membership_roles`, and `user_settings`: authenticated/self policies.
- Foundation tenant data: tenant SELECT/INSERT/UPDATE policies; no DELETE policies.
- `notifications`: own-record SELECT.
- Storage objects: authenticated reads limited to the declared private buckets.

The previous permissive Company Settings and Teams write policies are explicitly dropped by later migrations. Ordinary authenticated clients have no physical DELETE policy for the reviewed historical entities. RLS allows access to every active tenant membership; the application active-company context further narrows queries. Database-enforced active-company selection would require a trusted per-request claim or parameter and remains an architectural decision, not a validation change.

## Tests and results

Static checks performed:

- Migration ordering and dependency review: approved.
- Duplicate object/policy review: approved; later policy replacements use explicit `DROP POLICY IF EXISTS`.
- SECURITY DEFINER/search-path review: approved.
- Service-role usage review: approved statically.
- TypeScript/schema/form compatibility review: approved statically.
- Seed review: approved for local development only; it contains deterministic fictional accounts and no production credential.

Application validation results:

- `git diff --check`: approved; only Git's informational LF-to-CRLF working-copy warnings were emitted.
- `npm run lint`: approved with no findings.
- `npm run typecheck`: not available because `package.json` has no `typecheck` script.
- `npx tsc --noEmit`: approved as the available equivalent.
- `npm run build`: approved; Next.js compiled, type-checked, and generated all 35 routes. The first sandboxed attempt could not reach Google Fonts for Poppins; the controlled retry with network access succeeded without code changes.

Blocked tests:

- Clean `supabase db reset`, second reset, and schema introspection.
- SQL syntax execution and migration history inspection.
- Constraint/FK invalid-data scenarios.
- Index inspection through PostgreSQL catalogs and query plans.
- Trigger execution and deferred-trigger ordering.
- Company A/B RLS isolation with known foreign IDs.
- Owner/Admin/Manager/Supervisor/Employee/Contractor/Viewer scenarios.
- Physical DELETE attempts with authenticated roles.
- `create_company`, `create_team`, `update_team`, and forced rollback scenarios.
- Login, callback, session, Company Switcher, Company Management, Workforce, and Teams against a real test database.

## Corrections

`202607190007_database_integrity_validation.sql` was created rather than rewriting uncertain migration history. It:

- rejects tenant-key changes for memberships, settings, workforce records, teams, and team memberships;
- rejects employee or manager memberships from another company;
- prevents moving an existing team membership to another team/member identity;
- enforces one active leader link per team;
- validates, at transaction end, that Team leadership and active Team Membership role agree.

Before applying the correction to a persistent environment, inspect whether existing records violate these invariants. Apply it first to a disposable local or development database and retain it as a forward-only migration.

## Required commands when infrastructure becomes available

```text
npx supabase status
npx supabase start
npx supabase db reset
npx supabase db reset
git diff --check
npm run lint
npx tsc --noEmit
npm run build
```

Then execute authenticated SQL/API scenarios for two companies and all implemented roles, inspect `pg_policies`, `pg_trigger`, `pg_indexes`, constraints and foreign keys, and record the actual Supabase CLI/PostgreSQL versions. Do not use production.

## Residual risks and acceptance

The application and migration sources can pass static validation while runtime PostgreSQL syntax, existing-data compatibility, RLS behavior, rollback behavior, and seed execution remain unproven. Therefore the Sprint is not fully accepted and remains **BLOQUEADA POR AMBIENTE EXTERNO** until the controlled Supabase/PostgreSQL validation above passes.
