# STRATON --- TEAM MANAGEMENT

Version: 1.1 Status: Completed (Sprint 3.9) Last Updated: 2026-07-21

Team Management extends the Workforce Foundation tables `teams` and `team_memberships`. It does not create another Team, Company Membership, Workforce, or tenant-context model.

Each Team has one immutable `company_id`, an optional leader membership, operational status, presentation color/icon, timestamps, and optional archive timestamp. Names remain unique within a company through the existing constraint. Team Membership links an existing active Company Membership to a Team in the same company with leader, supervisor, or member role. The partial unique index prevents duplicate active links; `left_at` and `removed_at` preserve removal history.

All reads derive `company_id` from the authenticated active-company session. URL IDs are queried together with that trusted company ID, returning the same not-found response for missing and unauthorized teams. Mutations repeat authentication and role checks server-side, while RLS restricts management to owner, admin, administrator, or manager. The database trigger blocks cross-company, inactive-member, and archived-team associations.

Creation uses a transactional database function that validates the actor, company, leader, unique member IDs, and active memberships before creating the Team and initial links. An optional leader is automatically included as a leader member. Leader changes demote the prior leader and ensure the new leader has an active team link. A leader cannot be removed until leadership is reassigned or cleared.

Archival changes status and timestamp only. Members and history remain intact, and archived teams reject new memberships. Reactivation restores active status without recreating records.

Company Management supplies the tenant boundary and team summary. Workforce supplies people and Company Memberships. Future organograms, projects, planning, timesheets, GPS, scheduling, and audit activity should reference Team IDs without weakening these boundaries.
