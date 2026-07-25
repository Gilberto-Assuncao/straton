# Sprint 3.5.2 — App Shell, Navigation & Layout System

**Status:** Concluída

## Objective

Organize durable STRATON documentation and establish the reusable visual shell for authenticated application screens.

## Scope

- Documentation index, vision, roadmap, sprint record, and conceptual future-module architecture.
- App Shell with responsive sidebar, mobile drawer, header, breadcrumb, main content, and discreet footer.
- Visual global search, company and language selectors, notification dropdown, and user menu.
- Dashboard integration without removing existing content.

## Planned files

Documentation under `docs/`; reusable components under `src/components/layout`, `src/components/navigation`, and `src/components/ui`; dashboard layout integration in `app/dashboard/layout.tsx` or its existing shell boundary.

## Restrictions

No backend, API, database, authentication, authorization, payroll, profitability, weather, marketplace, real notifications, global provider, commit, or push changes. Existing uncommitted work must be preserved.

## Acceptance criteria

Documentation is organized without lost content; index links resolve; App Shell, sidebar, header, breadcrumb, footer, switchers, notifications, and user menu exist; dashboard uses the shell; mobile and keyboard behavior are accessible; no horizontal overflow; lint, TypeScript build, and production build pass.

## Validation

Run `npm run lint`, `npm run build`, `git diff --check`, and `git status`. No standalone typecheck script currently exists; `next build` performs TypeScript validation.
