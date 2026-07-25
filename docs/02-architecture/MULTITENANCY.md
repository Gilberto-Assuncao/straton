# STRATON --- MULTITENANCY

Version: 1.1 Status: Completed (foundation) / Planned (cross-company features) Last Updated: 2026-07-21

# Purpose

This document defines the actual multi-tenancy architecture implemented in STRATON as of Sprint 3.7–3.9, plus the parts that remain planned.

------------------------------------------------------------------------

# Core Concept: Company is the tenant

STRATON does **not** have a separate "Tenant" entity above Company. **`Company` is the tenant boundary.** A permanent `User` (`public.users`, one row per `auth.users` identity) never belongs to a company directly — it holds zero or more `company_memberships`, each linking the user to exactly one company with a status (`invited`, `active`, `suspended`) and one or more roles.

``` text
User (public.users)
└── company_memberships (many, one per Company)
    └── Company
        ├── Teams → team_memberships
        ├── employee_records (Workforce)
        ├── Projects → Sites
        ├── Timesheets → timesheet_entries
        ├── Reports
        └── Company Settings
```

Every tenant-owned table carries an explicit `company_id`. A user with active memberships in several companies can switch between them; membership — not a higher "tenant" concept — is what determines visible resources.

------------------------------------------------------------------------

# Active-company session

After server-side authentication, `getAuthenticatedSession()` (`src/application/session/server.ts`) loads only the caller's **active** memberships (joined with `companies` and roles) and exposes them as a minimal session DTO. The active company is selected from an `HttpOnly`, `SameSite=Lax` cookie (`straton-active-company`, 30-day expiry) or falls back to the first membership.

The cookie is a preference, not an authorization grant: every request re-validates that its value is still one of the user's active memberships (`requireActiveCompany()`), and an invalid/stale value falls back automatically. Switching companies (`CompanySwitcher` → Server Action) revalidates the user and checks membership before writing the cookie — it never widens what the user can see.

------------------------------------------------------------------------

# Isolation model (implemented)

- Every application query filters by the trusted, server-resolved `companyId` from `requireActiveCompany()` — never by a `company_id` read from client-submitted form data.
- Postgres RLS is enabled on every tenant-owned table (migrations 1 through 7).
- `private.is_company_member(company_id)` and `private.has_company_role(company_id, allowed_roles[])` — both `security definer` SQL functions keyed off `auth.uid()` — are the enforcement primitives used across policies.
- Service-role (admin) database access bypasses RLS entirely and must stay server-only and narrowly scoped.
- Switching companies changes query context only; it never broadens a membership's access.

------------------------------------------------------------------------

# What is explicitly NOT implemented yet

- Full RBAC (Sprint 3.7–3.9 add only the policies needed to discover the signed-in user's roles/settings — see [AUTHORIZATION.md](AUTHORIZATION.md)).
- Company onboarding/invitation workflows, billing account creation.
- Cross-company reporting, parent/child company hierarchies, shared services, or white-label deployments. These stay architecturally possible (nothing here blocks them) but are Planned, not built.

------------------------------------------------------------------------

# Goal

Keep every tenant-owned record isolated by `company_id`, enforced identically at the application layer and in the database, without inventing an abstraction (a "Tenant" above Company) that does not exist in the schema.
