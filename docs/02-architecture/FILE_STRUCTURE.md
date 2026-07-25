# STRATON --- FILE STRUCTURE

Version: 1.1 Status: Completed (foundation), evolving Last Updated: 2026-07-21

# Purpose

This document defines the **actual** repository and folder organization implemented in STRATON today. It must stay in sync with `00 Governance/PROJECT_STRUCTURE.md` — if they ever disagree, re-check the real repo, since neither document overrides observed code.

------------------------------------------------------------------------

# Principles

-   Organize by domain before technology.
-   Keep modules cohesive.
-   Avoid circular dependencies.
-   Separate business logic from UI.
-   Prefer explicit over implicit organization.

------------------------------------------------------------------------

# Actual repository structure

``` text
app/                  # Next.js App Router routes (current, real)
components/           # Legacy first-generation UI (pre-app-shell); do not build new features here
lib/                   # Legacy support: mock data, dashboard-era types/config
proxy.ts               # Next.js 16 replacement for middleware.ts — session refresh + optimistic redirects
src/
├── domain/            # Framework-independent domain contracts (no React/Next/Supabase)
├── application/       # Session/auth orchestration (src/application/session/*), repositories
├── infrastructure/     # Supabase clients (client.ts, server.ts, admin.ts), env config
├── features/           # Vertical feature modules: companies, teams, workforce (each: actions/data.ts/types/validation/components)
├── components/          # The current design system: app-shell, ui, forms, tables, cards, navigation, layout
└── design-system/        # Design tokens
supabase/
├── migrations/          # SQL schema, chronological
└── seed.sql             # Dev-only seed data
scripts/                  # test-auth.ps1
docs/                     # This documentation tree
```

There is **no** root-level `features/`, `hooks/`, `services/`, or `types/` folder — those concerns live inside `src/features/*` and `src/domain`/`src/application`/`src/infrastructure` respectively. Do not create them without an explicit architectural decision (see `00 Governance/PROJECT_DECISIONS.md`).

------------------------------------------------------------------------

# Folder responsibilities

## app/

Routes, layouts, route metadata. `app/dashboard/*` are the authenticated-area pages; most still read from `lib/mock/*` pending the Sprint 5 migration (see [../05-sprints/](../05-sprints/)).

## components/ (legacy) vs. src/components/ (current)

`components/dashboard/*` (Sidebar, MobileSidebar, old UserMenu, Topbar) predates the app-shell and is **not rendered by any route today** — the live shell is `src/components/app-shell/*`, composed by `components/dashboard/DashboardShell.tsx`. Do not extend the legacy folder for new work.

## src/domain/

Pure business rules and entities (Company, Project, Timesheet, User, Role, Permission, etc.) — no framework or persistence code.

## src/application/

Orchestration: `src/application/session/server.ts` (`getAuthenticatedSession`, `requireAuthenticatedSession`, `requireActiveCompany`), auth service, repositories.

## src/infrastructure/

Supabase clients (`client.ts` browser, `server.ts` server, `admin.ts` service-role — never expose the admin client to the browser), env config.

## src/features/{companies,teams,workforce}/

Vertical modules. Companies and Teams are wired to real Supabase queries via a `data.ts` file following the pattern: `Feature → data.ts → Supabase server client → Database`. Workforce still uses a hardcoded `data/demo-workforce.ts` array pending migration.

## src/components/

The current, "official" design system: `app-shell`, `ui`, `forms`, `data-display`, `tables`, `dashboard`, `cards`, `feedback`, `navigation`, `timeline`, `charts`, `maps`, `layout`.

## supabase/

`migrations/*.sql` is the real schema (see [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)); `seed.sql` is development-only.

------------------------------------------------------------------------

# Import rules

-   Prefer absolute imports (`@/...`).
-   New features follow the `src/features/*` pattern; do not invent a parallel `services/` or `repositories/` layer.

------------------------------------------------------------------------

# Naming conventions

Components: PascalCase. Feature data/action files: `data.ts`, `actions.ts`, `types.ts`, `validation.ts`. Types: PascalCase. Constants: `UPPER_SNAKE_CASE`.

------------------------------------------------------------------------

# Dependency rules

Allowed flow: `UI (app/, src/components) → src/features/*/data.ts → src/infrastructure/supabase → Database`. `src/domain` has no outward dependencies; `src/application` may depend on `src/domain` and `src/infrastructure`; UI may depend on `src/application`/`src/features` view data. Lower layers must never import from upper layers.

------------------------------------------------------------------------

# Goal

Keep this document a faithful mirror of the real repository, not an aspirational template — update it whenever a folder's responsibility actually changes.
