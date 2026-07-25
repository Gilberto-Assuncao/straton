# STRATON --- ROADMAP (CONFIRMED DELIVERY)

Version: 1.1 Status: Active Last Updated: 2026-07-21

## Confirmed delivery

The Git history confirms delivery of the landing page and mobile navigation, authentication interface, dashboard shell and KPIs, employee management interface, architecture consistency improvements, time tracking, timesheets, projects/clients, domain and SaaS foundations, the Design System, and Sprint 3.5.2 App Shell integration.

## Completed foundation

**Sprint 3.7 — Authentication & Multi-Tenant Foundation:** completed locally with Supabase authentication, persistent cookie sessions, protected internal routes, authenticated App Shell identity, active-company context, company switching, and minimum supporting RLS policies.

## Completed company foundation

**Sprint 3.8 — Company Management:** completed locally with authorized overview, transactional creation, editing, settings, summaries, safe archival, and active-company integration.

## Current sprint

**Sprint 3.9 — Teams:** deliver active-company team overview, creation, details, editing, leadership, membership management, safe archival, Workforce integration, and tenant authorization.

## Product decision: multi-segment, not construction-only (2026-07-21)

STRATON's target market widened from construction-only to any service business managing people, time, and physical work locations (Construction, Cleaning, Electrical, HVAC, Security, Logistics, Hospitality, Facility Management, etc.). Construction stays a primary segment. The one construction-specific name in the codebase, `Chantier` (table, domain type, nav label), was renamed to the neutral `Site` — see `supabase/migrations/202607210001_generalize_chantier_to_site.sql`. A free-text `reference` field was added to Site at the same time (common Belgian business practice, distinct from the existing `po_number`).

## Sprints 4.0–4.3 (specifications executed, UI wiring incomplete)

Sprints 4.0 (Projects Management), 4.2 (Time Tracking Engine), and 4.3 (Timesheets) match commits in git history (`feat: add projects and clients module`, `feat: add time tracking module`, `feat: add timesheets module`) and have real database tables (`projects`, `chantiers`, `timesheets`, `timesheet_entries`). Sprint 4.1 (Chantiers Management) has no clearly matching commit as of this consolidation — verify before assuming it shipped. The Sprint 5 mock-data audit (see `../05-sprints/`) found that the dashboard UI for Workforce, Time Tracking, Timesheets, Employees, and Projects still reads from `lib/mock/*` despite the underlying tables existing — these modules are **In Progress**, not Planned and not fully Completed.

## Sprint 5 complete (2026-07-21)

All nine steps shipped and were browser-verified with real Supabase data: current-user session, Workforce, a Time Tracking/Timesheets schema foundation (tasks + per-entry status), Time Tracking, Timesheets, Employees, a Projects/Clients schema foundation (budget/priority/members), Projects, and the Dashboard aggregates. Along the way, two systemic bugs were found and fixed across the whole schema: missing `GRANT`s for `authenticated` on most tables (RLS alone is not sufficient), and ambiguous PostgREST embeds wherever a table has more than one foreign key to the same target — both are documented in `../02-architecture/DATABASE_ARCHITECTURE.md` as lessons for every future Sprint. Remaining known gap: several write actions (time entry persistence, timesheet submit/approve/reject, employee invitation, project creation) are still intentionally TODO-stubbed — Sprint 5 covered the read side only.

## Next sprint

Detailed RBAC, invitations, schedules, sensitive employment data, billing, payroll, cost, and profitability remain planned. Six items were promoted from Future Ideas to Planned (target 6.x) on 2026-07-21: Weather Intelligence, Live Operations Map, Team/Site Hours Divergence Reporting, Multi-language (incl. Eastern Europe), Configurable Schedules & Punctuality Reminders, and Manager/Accountant Roster & Compliance Reports — see `FEATURE_ROADMAP.md` and `FUTURE_IDEAS.md`.

## Planned modules

STRATON Connect, Contractor Network, finance, accounting, marketplace, document workflows, certificate verification, Weather Intelligence, Workforce Cost & Profitability Intelligence, Payroll & Social Rules Engine, internationalization, and AI assistance are planned concepts. This roadmap does not claim they are implemented.
