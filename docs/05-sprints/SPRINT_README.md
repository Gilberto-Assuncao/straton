# STRATON --- Sprint Documentation

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This directory contains the official Sprint management documentation for
the STRATON project. It standardizes planning, execution, measurement,
and continuous improvement across all development iterations.

------------------------------------------------------------------------

# Objectives

-   Standardize Sprint execution
-   Improve delivery predictability
-   Increase transparency
-   Support continuous improvement
-   Provide reusable Sprint templates

------------------------------------------------------------------------

# Recommended Reading Order

1.  SPRINT_PLANNING.md
2.  SPRINT_EXECUTION.md
3.  SPRINT_TEMPLATE.md
4.  DEFINITION_OF_READY.md
5.  SPRINT_METRICS.md

------------------------------------------------------------------------

# Sprint Lifecycle

The official Sprint lifecycle is:

1.  Backlog Refinement
2.  Sprint Planning
3.  Sprint Execution
4.  Code Review
5.  Testing
6.  Sprint Review
7.  Retrospective
8.  Metrics Analysis

------------------------------------------------------------------------

# Sprint History

Actual Sprints executed so far, oldest first:

- [3.5.2](sprint-3.5.2.md) — App Shell
- [3.6](sprint-3.6.md) — Workforce Management foundation
- [3.7](sprint-3.7.md) — Authentication & Multi-Tenant foundation
- [3.8](sprint-3.8.md) — Company Management
- [3.9](sprint-3.9.md) — Teams
- [3.9.1](sprint-3.9.1-database-validation.md) — Database validation (blocked — Docker/Supabase CLI unavailable in that session)
- [4.0](sprint-4.0-projects-management.md) — Projects Management (specification; matches `feat: add projects and clients module` in git log)
- [4.1](sprint-4.1-chantiers-management.md) — Chantiers Management (specification; implementation status unverified as of this consolidation). Note: on 2026-07-21 the underlying entity was renamed "Chantier" → "Site" to support any service segment, not only construction — see `supabase/migrations/202607210001_generalize_chantier_to_site.sql`. This spec file keeps its original wording as a historical record; read "Site" wherever it says "Chantier".
- [4.2](sprint-4.2-time-tracking-engine.md) — Time Tracking Engine (specification; matches `feat: add time tracking module`)
- [4.3](sprint-4.3-timesheets.md) — Timesheets (specification; matches `feat: add timesheets module`)

The 4.x entries are the original specifications only — no as-built retrospective has been written for them yet (unlike the 3.x series). A future Sprint should add one, cross-checked against the actual code, since the Sprint 5 mock-data audit found that Time Tracking, Timesheets, and Projects still read from `lib/mock/*` in the dashboard UI despite the underlying database tables existing.

------------------------------------------------------------------------

# Relationship with Other Documentation

-   Governance defines project rules.
-   Product defines priorities.
-   Architecture defines technical decisions.
-   Design defines user experience.
-   Development defines implementation.
-   Sprint documentation defines execution.

------------------------------------------------------------------------

# Maintenance

Update this documentation whenever:

-   Sprint processes evolve
-   New engineering practices are adopted
-   Metrics change
-   Templates are improved

------------------------------------------------------------------------

# Goal

Provide a single source of truth for Sprint planning and execution,
enabling predictable delivery, continuous learning, and sustainable
software development.
