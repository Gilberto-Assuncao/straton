# STRATON --- PRODUCT REQUIREMENTS DOCUMENT (PRD)

Version: 1.1 Status: In Progress (v1.0 "Core Release" scope defined; see per-requirement status below) Last Updated: 2026-07-21

# Purpose

This PRD translates the Vision ([PRODUCT_VISION.md](PRODUCT_VISION.md)) into concrete requirements for STRATON's first stable version (**v1.0 — "Core Release"**), ported from `Documentacao Projeto STRATON/STRATON_MASTER_DOCUMENTATION_7.md` (chapter 5). It replaces an earlier generic draft of this file.

------------------------------------------------------------------------

# Functional requirements (v1.0)

| ID | Requirement | Module | Priority | Implementation status |
| --- | --- | --- | --- | --- |
| RF-01 | An authenticated user can create a Time Entry linked to a Project in ≤3 clicks from the home screen | Time Tracking | P0 | Planned — dashboard `time` page still on mock data |
| RF-02 | A manager can approve or reject a Team's Time Entries, with a mandatory reason on rejection | Time Tracking, Teams | P0 | Planned |
| RF-03 | A Company admin can create, edit, and deactivate Teams and assign Workforce Members to them | Teams, Workforce | P0 | Completed (Teams); Workforce still on mock data |
| RF-04 | An admin can create Projects with an hour budget and associate them with one or more Teams | Projects | P0 | Planned — no budget field in schema yet |
| RF-05 | The system generates an hours report by Project, Team, and Workforce Member, filterable by period | Reports | P0 | Planned |
| RF-06 | The system automatically calculates the Company's monthly invoice from active Workforce Members and contracted Plan | Billing | P0 | Planned — no billing schema yet, see [PRICING_STRATEGY.md](PRICING_STRATEGY.md) |
| RF-07 | An admin can invite new users by email, setting their initial role | Administration, Authentication | P0 | Completed (Authentication foundation); invitation flow not built |
| RF-08 | The system must prevent, at every layer (UI, Server Action, database), a user from one Company viewing another Company's data | All modules | P0 (release-blocking) | **Completed** — RLS + `requireActiveCompany()` enforced for Companies/Teams; extends automatically to new modules following the same pattern |
| RF-09 | A Workforce Member can see, on one screen, how much of their time is already allocated this week vs. expected capacity | Workforce | P1 | Planned |
| RF-10 | The system notifies a manager when Time Entries have been pending approval for more than 48 hours | Notifications | P1 | Planned |

------------------------------------------------------------------------

# Non-functional requirements (v1.0)

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| RNF-01 | Multi-tenant isolation | No query returns data outside the authenticated user's `company_id`, verified by an automated test |
| RNF-02 | List performance | Time Entries screen loads in ≤1.5s (p95) for Companies with up to 300 Workforce Members |
| RNF-03 | Availability | 99.5% monthly uptime in production |
| RNF-04 | Auditability | Every change to an approved Time Entry generates an immutable history record (who, when, previous value, new value) |

------------------------------------------------------------------------

# Explicitly out of scope for v1.0

- External integrations (Jira, Linear, Asana, calendars) — depends on a stable core first.
- Offline time entry — needs a sync architecture not yet designed.
- Automated multi-currency/multi-gateway billing — v1.0 covers invoice calculation only; automated collection is v1.1+.
- Per-company customizable approval workflow — contradicts the v1.0 simplicity principle.

------------------------------------------------------------------------

# Definition of Done for a PRD requirement

A requirement is only "implemented" once, cumulatively: it respects [BUSINESS_RULES.md](BUSINESS_RULES.md); RNF-01 has been validated with a dedicated automated test; the UI follows the Design System; every sensitive mutation has an audit log; and this document has been updated if implementation revealed a business rule not previously captured here.

------------------------------------------------------------------------

# Common mistakes

- Treating RF-08 (multi-tenant isolation) as a "technical requirement" rather than a P0 release-blocking product requirement — its failure destroys the trust the whole Vision depends on.
- Implementing RF-06 (invoice calculation) without following the proration rules in [PRICING_STRATEGY.md](PRICING_STRATEGY.md).

------------------------------------------------------------------------

# Goal

Keep this PRD as the bridge between "why we are building this" (Vision/Strategy) and "what exactly we are building" — updated as each requirement's real implementation status changes.
