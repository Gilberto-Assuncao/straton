# STRATON --- FUTURE IDEAS

Version: 1.0 Status: Living Document Last Updated: 2026-07-21

# Purpose

This document captures long-term ideas and innovation opportunities for
STRATON that are not yet scheduled in the official roadmap.

------------------------------------------------------------------------

# Evaluation Criteria

Before becoming roadmap items, ideas should be evaluated for:

-   Customer value
-   Business impact
-   Technical feasibility
-   Strategic alignment
-   Estimated implementation effort

------------------------------------------------------------------------

# Innovation Backlog

## Artificial Intelligence

-   AI assistant for managers
-   Smart timesheet validation
-   Predictive workforce planning
-   Natural language reporting

Status: Research

------------------------------------------------------------------------

## Company creation — VAT autofill (VIES)

-   Type a VAT number during company creation, autofill legal name/address from the EU VIES service instead of manual entry.
-   Full technical plan (endpoint approach, where it hooks into `create_company`, what it does and does not cover) already written up in [../02-architecture/COMPANY_MANAGEMENT.md](../02-architecture/COMPANY_MANAGEMENT.md#planned-vat-based-company-autofill-vies--decision-pending-prepared-for-implementation) — ready to pick up as a self-contained Sprint whenever prioritized.

Status: Planned (prepared for implementation, registered 2026-07-21)

------------------------------------------------------------------------

## STRATON Connect

-   External partner connectivity
-   Customer portal
-   Secure data exchange

Status: Concept

------------------------------------------------------------------------

## Contractor Network

-   Company directory
-   Contractor matching
-   Skills marketplace

Status: Concept

------------------------------------------------------------------------

## Workforce Intelligence

-   Productivity insights
-   Capacity forecasting
-   Cost optimization
-   Profitability analysis

Status: Research

------------------------------------------------------------------------

## Weather Intelligence

-   Weather-aware scheduling
-   Risk alerts
-   Automatic planning suggestions
-   Concrete scenario registered 2026-07-21: alert a manager when forecast weather (e.g. a snowstorm) may delay or block a scheduled Site's work, and suggest moving that work earlier. See [../02-architecture/WEATHER_INTELLIGENCE.md](../02-architecture/WEATHER_INTELLIGENCE.md) for the existing conceptual architecture this extends (provider-neutral adapter, Site coordinates, no automatic rewriting of authoritative timesheets).

Status: **Completed (first slice)** — Sprint 6.7 (2026-07-22). Provider decided: Open-Meteo (free, keyless, avoids tying the project to a paid account). Delivered: a provider-neutral `WeatherProvider` adapter (`src/infrastructure/weather/`), a 7-day forecast + delay-risk alert (heavy rain / strong wind thresholds) per Site, and the first-ever `/dashboard/sites` page (read-only list, enabled in nav). Not built yet: persisted forecast snapshots, historical-observation distinction, audit logs, retention rules, and project-report integration — the original doc's "traceable snapshot history" ambition is still open.

------------------------------------------------------------------------

## Live Operations Map

-   Manager-facing map view: where each team member clocked in (geolocation captured at Time Tracking start/stop), which Sites are active, and whether anyone is currently working at each one.
-   Builds directly on data that will already exist once Time Tracking write persistence ships (Sprint 5.4 only wired the read side) and on `sites.latitude`/`longitude` — no new entities needed, only a geolocation capture point on clock-in/out and a map UI. `src/components/maps/Maps.tsx` (`MapContainer`, `GpsBadge`, `SiteMarker`) already exists as a design-system placeholder for this.
-   Privacy note to resolve before building: capturing an employee's clock-in location is more sensitive than the Site's own coordinates — needs an explicit permission/consent design, not just a schema addition (ties into the GDPR gap already flagged in `02-architecture/DATABASE_ARCHITECTURE.md`).

Status: **Completed (first slice)** — Sprint 6.9 (2026-07-22). Consent decision: explicit per-employee opt-in (a toggle in `/dashboard/settings`, off by default), not a company-wide policy — chosen so a manager can't unilaterally turn on location tracking for their whole team. Delivered: `user_settings.location_consent`/`location_consent_at` columns, geolocation captured client-side only on timer stop (never on manual entries), the server re-verifies consent before persisting (never trusts the client), and `/dashboard/map` shows each opted-in member's most recent clock-in location with a relative-map placeholder layout (no real basemap library wired up — that would be its own provider decision). Known limitation: there is no persisted "currently running" session in the schema, so this shows "where they started their last completed session today," not true real-time presence.

------------------------------------------------------------------------

## Team/Role/Site Segmentation and Hours Divergence Reporting

-   Let a company view and filter workforce by Team, role, manager (`employee_records.manager_membership_id` already models this), and Site, then surface divergence in hours logged between members of the same team for the same period.
-   Mostly a reporting/query feature on top of entities that already exist (`teams`, `team_memberships`, `employee_records`, `sites`, `timesheet_entries`) — no new tables anticipated, though a dedicated aggregation view or RPC would likely be needed once volume grows beyond simple client-side computation (the pattern used so far in Workforce/Time Tracking/Timesheets).

Status: **Completed** — delivered Sprint 6.5 (2026-07-21), browser-verified with real Supabase data at `/dashboard/reports`. Team + Site hours only; role/manager filter dimensions from the original idea are not yet built.

------------------------------------------------------------------------

## Client/Site Workspace Page + External Cloud Storage

-   A dedicated page per client or Site: team assigned, schedules, photos, documents, tasks, and history in one place.
-   Requires the platform to connect to the client's own cloud storage (Google Drive, Dropbox) to create/edit/save files such as photos, rather than only using STRATON's own Supabase Storage buckets.
-   This is a materially larger integration than anything built so far: OAuth per external provider, per-Company (or even per-client) credential storage, and a file-sync/permission model distinct from the existing Supabase Storage buckets (`avatars`, `company-logos`, `documents`, `reports`, `certificates`, `project-images`, `site-photos` — `site-photos` already anticipates this exact photo use case at the bucket-naming level, just not connected to an external provider yet).
-   Sequencing note: the "client/Site page" content (team, schedule, tasks, history) is mostly a UI aggregation of data that will already exist; the external cloud storage connector is the hard, separate part and should be scoped as its own Sprint, not bundled in.

Status: Concept (registered 2026-07-21)

------------------------------------------------------------------------

## Multi-language — Eastern European languages in scope

-   Confirms and sharpens the multi-language architecture note already registered in `01-product/PRODUCT_VISION.md` and `02-architecture/DATABASE_ARCHITECTURE.md`: language coverage must include Eastern European languages (e.g. Polish, Romanian), reflecting the workforce composition common in large European cities, not just Belgium's own official languages.
-   No new data-model work — `localization_settings` already stores an arbitrary `language` per user or company. The gap remains the same one already flagged: no i18n framework is installed in the app yet.

Status: **In Progress** — Sprint 6.6 (2026-07-22): next-intl chosen and installed, `app/` moved under `app/[locale]/`, `proxy.ts` now runs next-intl's routing alongside the existing Supabase auth gate, and the sidebar navigation + login form are wired and browser-verified in all 9 locales (en/pt/fr/nl/de/pl/ro/es/it). Remaining: translate the rest of the app's pages/components — only nav labels and the login form have real message keys so far.

------------------------------------------------------------------------

## Configurable Work Schedule and Punctuality Reminders

-   Let a company (or a user, overriding the company default) configure expected break/lunch windows, expected clock-in/out times, and a grace period for registering the start/end of work.
-   Notify the user during the day if they haven't clocked in/out yet, and flag a late entry when it is eventually submitted.
-   `company_settings` already has `week_starts_on`, `date_format`, `time_format`, `notifications_enabled` — this would add schedule-specific fields (e.g. expected start/end time, break windows, grace-period minutes) plus a scheduled/background job to evaluate "is anyone late right now," which is new: nothing in the current architecture runs on a timer (everything today is request-driven).

Status: **Completed (first slice)** — Sprint 6.10 (2026-07-22). Background-job decision: Vercel Cron calling a secured API route (`/api/cron/punctuality`, `CRON_SECRET`-gated, schedule in `vercel.json`), not pg_cron — keeps the logic in the app layer like everything else, at the cost of the cron only firing when deployed on Vercel. Delivered: `company_settings.expected_start_time/expected_end_time/grace_minutes/punctuality_reminders_enabled`, a settings-form section to configure them, and the cron endpoint that creates a real `notifications` row for anyone who hasn't clocked in by the deadline (deduped per user per day, timezone-aware). Browser-verified end to end: configured the schedule, hit the endpoint, saw the notification land in the bell. Two real bugs found and fixed along the way: a naive UTC-midnight boundary that mis-excluded entries made just after local midnight in timezones ahead of UTC, and `notifications` never having a `metadata` column at all — the insert was failing silently until both were fixed. Company-level schedule only in this slice — no per-user override yet.

------------------------------------------------------------------------

## Manager/Accountant/HR Roster and Compliance Reports

-   Let a Company register who holds the manager, accountant, HR, and finance roles specifically (the `accountant` role already exists in the seeded role catalog — `roles.key = 'accountant'` — but nothing currently uses it to scope a workflow).
-   Generate hours reports formatted to the Belgian labor-law norm, for the client to export and send by email — generated by the platform, with a STRATON link in the email body for organic/marketing exposure.
-   Longer-term: integrate with accounting/invoicing ("faturação") software — this is the same "Payroll & Compliance" and "accounting" territory already listed as Future elsewhere in this document and in `company_settings.accounting_provider` (column already exists, unused); this entry adds the concrete Belgian-norm report + branded email detail on top of that existing placeholder.

Status: **Planned** — prioritized 2026-07-21, promoted to `06-roadmap/FEATURE_ROADMAP.md` (target 6.x) for the roster + Belgian-norm report + branded email. The accounting/invoicing software integration itself stays a separate, later Future item — do not conflate the two when scoping a Sprint.

------------------------------------------------------------------------

## Payroll & Compliance

-   Country-specific payroll engines
-   Labor rule validation
-   Compliance monitoring

Status: Future

------------------------------------------------------------------------

## Notification Channels

-   WhatsApp as an additional delivery channel for `notifications` (alongside in-app/email/push already modeled in `user_settings.notification_preferences`) — e.g. timesheet-approval alerts, generated Report links.
-   Would go through a WhatsApp Business API provider (Twilio, 360dialog, Gupshup), not a direct Meta integration.
-   Constraints to design around: business-initiated messages require Meta-approved templates and explicit user opt-in (no free-text push), plus a per-conversation cost — complements existing channels, does not replace them.
-   Fits the existing Integrations item in the roadmap; not scheduled yet.

Status: Concept (registered 2026-07-21, not yet evaluated for priority)

------------------------------------------------------------------------

## Marketplace

-   Third-party extensions
-   Public integrations
-   Partner ecosystem

Status: Future

------------------------------------------------------------------------

# Promotion Process

An idea may move to the official roadmap when:

-   Business case is approved
-   Technical feasibility is validated
-   Dependencies are understood
-   Priority is assigned

------------------------------------------------------------------------

# Review Frequency

Review this document quarterly during roadmap planning.

------------------------------------------------------------------------

# Goal

Maintain a structured innovation backlog while keeping the official
roadmap focused on committed deliveries.
