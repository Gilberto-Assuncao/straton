# STRATON --- AUTHORIZATION

Version: 1.1 Status: In Progress (foundation implemented, full RBAC planned) Last Updated: 2026-07-21

# Purpose

This document defines the authorization model for STRATON: what is enforced today versus what is still planned. See [AUTHENTICATION.md](AUTHENTICATION.md) for identity verification, and [MULTITENANCY.md](MULTITENANCY.md) for the Company-as-tenant model this document assumes.

------------------------------------------------------------------------

# Principles

- Authentication identifies the user; authorization grants permissions.
- All authorization decisions are enforced on the server (Server Actions, data-access functions, RLS) — never trusted from the client.

------------------------------------------------------------------------

# Scope: Company, not a separate Tenant

Access is isolated by `Company` (there is no separate "Tenant" entity — see MULTITENANCY.md). A user's permissions inside a company come from that company's `company_memberships` row and its assigned roles; permissions never carry over between companies.

------------------------------------------------------------------------

# Roles — implemented vs. planned

**Implemented today:** the `roles` table is seeded with only `admin` and `system` role rows (`admin`, `viewer`). RLS policies additionally check for the role keys `owner`, `admin`, `administrator`, `manager`, and `supervisor` via `private.has_company_role(company_id, allowed_roles[])` — for example, team and employee-record writes require one of `owner/admin/administrator/manager`, and team-membership writes also allow `supervisor`.

**Planned, not implemented:** a full, product-defined role catalog (e.g. a dedicated `Employee` read-only role), custom/company-specific roles, permission groups, and temporary/expiring permissions. Today's model is intentionally minimal — enough to gate the write operations that exist, not a complete RBAC system.

------------------------------------------------------------------------

# Permission categories (by module)

Companies, Teams, Workforce, Projects, Time Tracking, Reports, Settings, Billing — each conceptually needs Read/Create/Update/Delete, but only Companies and Teams currently have real enforcement wired end-to-end (Workforce/Projects/Time Tracking/Timesheets/Reports/Billing are still on mock data per the Sprint 5 plan and have no permission checks to enforce yet).

------------------------------------------------------------------------

# Enforcement (implemented pattern)

Authorization checks happen in three layers, all present for Companies/Teams today:
1. Postgres RLS policy (`private.is_company_member`, `private.has_company_role`) — the final boundary, cannot be bypassed by application bugs.
2. Server Action / `data.ts` re-check via `requireActiveCompany()` before any Supabase call.
3. Security-definer RPCs (`create_company`, `create_team`, `update_team`) re-validate the actor and role inside the transaction.

Never rely on client-side permission checks alone.

------------------------------------------------------------------------

# Future expansion (planned)

Custom roles, permission groups, temporary/expiring permissions, and enterprise-tier policy overrides — none of this exists yet; do not design new features assuming it does.

------------------------------------------------------------------------

# Goal

Keep authorization enforced identically at the database and application layers, and keep this document honest about the gap between the minimal role set implemented today and the fuller RBAC that is still planned.
