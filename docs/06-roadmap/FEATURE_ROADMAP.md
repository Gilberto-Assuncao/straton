# STRATON --- FEATURE ROADMAP

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document tracks the implementation status of every major functional
module in STRATON.

  Module               Status        Target Sprint   Dependencies
  -------------------- ------------- --------------- --------------------
  Authentication       Completed     3.7             Supabase
  Multi-Tenancy        Completed     3.7             Authentication
  Company Management   Completed     3.8             Multi-Tenancy
  Teams                Completed     3.9             Company Management (browser-verified 2026-07-21 after fixing missing grants + PGRST201 ambiguous embeds)
  Workforce            Completed     3.6, 5.2        Teams (browser-verified 2026-07-21 with real Supabase data)
  Time Tracking        Completed     4.2, 5.4, 6.1   Workforce (browser-verified 2026-07-21 with real Supabase data; timer stop and manual-entry save now persist real timesheet_entries as of Sprint 6.1)
  Timesheets           Completed     4.3, 5.5, 6.2   Time Tracking (browser-verified 2026-07-21 with real Supabase data; Submit/Approve/Reject now write real status transitions as of Sprint 6.2 — Approve/Reject requires filtering to a single employee)
  Employees            Completed     3.6, 5.6, 6.3   Workforce (browser-verified 2026-07-21 with real Supabase data; invitation flow now sends a real Supabase Auth invite as of Sprint 6.3 — found and fixed two systemic grant gaps along the way, see DATABASE_ARCHITECTURE.md; team assignment deferred until an accept-invitation flow exists)
  Projects & Clients   Completed     4.0, 5.7-5.8, 6.4 Companies (browser-verified 2026-07-21 with real Supabase data; found and worked around an RLS gap where a project's client company isn't readable unless the caller is also a member — see DATABASE_ARCHITECTURE.md; project creation now persists real rows as of Sprint 6.4)
  Sites (ex-Chantiers) In Progress   4.1, site-rename, 6.7 Projects (table renamed chantiers->sites 2026-07-21; first UI shipped 2026-07-22 at /dashboard/sites as a read-only list with weather forecast — no create/edit/delete yet, that's still the 4.1 UI work unverified/undone)
  Dashboard (aggregates) Completed    5.9             Workforce, Time Tracking, Timesheets, Projects (browser-verified 2026-07-21; KPIs/weekly chart/team activity/recent timesheets all real — Sprint 5 mock-data migration is now complete)
  Approvals            Planned       5.x+            Timesheets
  Reports              Planned       5.x+            Projects
  Notifications        In Progress   5.x+, 6.10      Authentication (bell now reads real public.notifications rows as of 2026-07-22, replacing the static demo array; only the late-clock-in reminder writes to it so far, but the read path/UI is real)
  Weather Intelligence         Completed  6.7  Sites (browser-verified 2026-07-22 with a real Open-Meteo forecast at /dashboard/sites — 7-day forecast per site, delay-risk alerts on heavy rain/strong wind. No persisted snapshots/audit trail/retention yet — forecasts are fetched live, not stored, so the "traceable snapshot history" part of the original concept is deferred — see FUTURE_IDEAS.md)
  Live Operations Map          Completed  6.9  Time Tracking write persistence, Sites (browser-verified 2026-07-22 at /dashboard/map — explicit per-employee opt-in consent in Settings, location captured only on timer stop, server re-checks consent before persisting. Models "where they last clocked in today", not true real-time presence — no open/running-session concept exists in the schema yet)
  Team/Site Hours Divergence Reporting  Completed  6.5  Workforce, Timesheets (browser-verified 2026-07-21 with real Supabase data — /dashboard/reports now shows per-member hours vs. team average, flagged at ±20%, plus hours by site; role/manager filter dimensions from the original idea not yet built, current view is company-wide for the current week only)
  Multi-language (incl. Eastern Europe) In Progress  6.6  localization_settings (browser-verified 2026-07-22: next-intl installed, routes moved under app/[locale]/, sidebar nav + login form wired and tested in en/pt/fr/nl/de/pl/ro/es/it. Framework decision made and infra shipped — translating the rest of the app's pages/components is the remaining work — see FUTURE_IDEAS.md)
  Configurable Schedules & Punctuality Reminders  Completed  6.10  Company Settings, Notifications (browser-verified 2026-07-22 — expected start/end time + grace period configurable per company, Vercel Cron hitting /api/cron/punctuality every 15 min, real notifications created and shown in the bell. Company-level schedule only, no per-user override yet — see FUTURE_IDEAS.md)
  Manager/Accountant Roster & Compliance Reports  Planned  6.x  Reports, Roles (prioritized 2026-07-21 — see FUTURE_IDEAS.md)
  Billing              Planned       6.x             Companies
  Public API           Planned       6.x             Core Modules
  Mobile               Planned       6.x             API
  AI Assistant         Planned       Future          Core Platform
  Integrations         Planned       Future          API
  Finance              Future        Future          Billing
  Marketplace          Future        Future          Finance

------------------------------------------------------------------------

# Status Definitions

-   **Completed** --- Delivered and validated.
-   **In Progress** --- Active Sprint.
-   **Unverified** --- A specification exists and may have shipped, but no matching commit/as-built review confirms it yet.
-   **Planned** --- Approved for future development.
-   **Future** --- Visionary feature, not yet scheduled.

------------------------------------------------------------------------

# Prioritization

Features are prioritized according to:

1.  Business value
2.  Customer impact
3.  Technical dependencies
4.  Delivery risk
5.  Engineering effort

------------------------------------------------------------------------

# Review

Review this document after every Sprint Review and update module status
accordingly.

------------------------------------------------------------------------

# Goal

Provide a single source of truth for the implementation progress of all
functional areas in STRATON.
