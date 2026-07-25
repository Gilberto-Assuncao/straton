# STRATON --- ARCHITECTURE PRINCIPLES

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document establishes the architectural principles that guide every
technical decision in STRATON.

------------------------------------------------------------------------

# Vision

Build a scalable, maintainable and predictable SaaS platform with a
clean architecture.

------------------------------------------------------------------------

# Principles

## Single Responsibility

Each module, service and component must have one clear purpose.

## Separation of Concerns

Business logic, infrastructure and presentation must remain separated.

## Modularity

Features should evolve independently whenever possible.

## Reuse Before Creation

Always reuse existing patterns before introducing new ones.

## Simplicity

Choose the simplest solution that satisfies the current requirement.

## Explicit Dependencies

Dependencies should be visible and intentional.

## Backward Compatibility

Avoid breaking existing features without approval.

------------------------------------------------------------------------

# Application layers

`src/domain` (framework-independent contracts) → `src/application` (use cases, session) → `src/infrastructure` (Supabase, external providers) → `src/features/*` (vertical modules) → UI (`app/`, `src/components`). Dependencies point inward only: domain code never imports Next.js, React, or Supabase; a feature may compose shared primitives, but shared layers must never import feature UI or route concerns.

------------------------------------------------------------------------

# Identity and companies

`User` and `ProfessionalProfile` represent the permanent STRATON identity. `Company` is independent. `CompanyMembership` is the time-bounded link between them — never model a user as owned directly by one company. `CompanyRelationship` connects organizations without merging their data.

------------------------------------------------------------------------

# Multi-tenancy

Tenant-owned entities carry a trusted `company_id`. Queries and mutations require tenant context, database indexes, and RLS. Cross-company access requires an explicit relationship and policy — convenience never justifies weakening isolation. See [../02-architecture/MULTITENANCY.md](../02-architecture/MULTITENANCY.md).

------------------------------------------------------------------------

# Data access

- Supabase is the single source of truth; avoid duplicated queries; prefer server-side data fetching through a feature's `data.ts` (see `src/features/companies`, `src/features/teams` as the reference implementation).
- Pages orchestrate data and view composition; presentational components receive typed, minimal props and contain no persistence or authorization rules. Mock data stays clearly isolated and must never simulate authentication or persistence.

------------------------------------------------------------------------

# UI Principles

-   Server Components by default.
-   Client Components only when interaction requires them.
-   Shared UI belongs in reusable components.

------------------------------------------------------------------------

# Evolution Rules

Architecture evolves incrementally through small, documented decisions.

Large refactors require explicit approval.

------------------------------------------------------------------------

# Documentation

Every permanent architectural decision must be reflected in:

-   PROJECT_DECISIONS.md
-   PROJECT_STRUCTURE.md
-   AI_CONTEXT.md

------------------------------------------------------------------------

# Goal

Maintain a robust architecture capable of supporting the long-term
evolution of STRATON.
