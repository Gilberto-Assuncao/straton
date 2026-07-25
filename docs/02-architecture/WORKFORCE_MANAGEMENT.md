# STRATON --- WORKFORCE MANAGEMENT

Version: 1.1 Status: In Progress (data model completed Sprint 3.6; dashboard UI still on mock data — see Sprint 5 plan) Last Updated: 2026-07-21

## Identity model

Profile is the permanent STRATON identity and maps to the existing `public.users` record linked to Supabase Auth. It is not duplicated per employer. Company remains an independent tenant. Company Membership is the historical relationship between Profile and Company, allowing one person to hold different roles in several organizations without losing their account when a relationship ends.

The existing `professional_profiles` table remains the optional public professional identity extension. Sprint 3.6 does not create a competing authentication or profile system.

## Workforce entities

- **Profile:** personal display and localization fields tied to authenticated identity.
- **Company:** legal/display identity, slug, localization, and lifecycle status.
- **Company Membership:** company/profile relationship, invitation and participation dates, status, and normalized roles through `membership_roles`.
- **Employee Record:** employment-specific data attached one-to-one to a membership. It intentionally excludes salary, tax, bank, medical, and highly sensitive documentation.
- **Team:** company-owned organizational group with optional leader membership.
- **Team Membership:** historical participation of a company membership in a team, including team role and dates.

## Roles and statuses

Initial company roles are owner, admin, manager, supervisor, employee, contractor, and viewer. The existing normalized Role and Permission foundation is reused; roles are not duplicated as a membership text column. Existing `administrator` data remains compatible while `admin` becomes the preferred Workforce key.

Membership status supports invited, active, suspended, inactive, left, and rejected. Employee Record separately tracks active, inactive, leave, suspended, terminated, or pending employment. Team lifecycle and Team Membership participation are independent so history can be preserved.

## Multi-tenant isolation

Employee Records, Teams, and Team Memberships carry `company_id`, indexes, RLS, and foreign keys. Members may read workforce data only within an active company membership. Owner, admin/administrator, and manager receive the initial management foundation; supervisors may manage team membership. This is deliberately not a complete RBAC engine.

A database trigger prevents a Team Membership from connecting a team and company membership belonging to different companies. Partial unique indexes prevent duplicate current company and team relationships while allowing historical rows after a membership is left or ended.

## Privacy and history

Profile deletion is not implied when employment ends. Membership, employment, and team dates preserve organizational history. Future retention and erasure workflows must distinguish legal company records from a person’s platform identity. Cost visibility is modeled as restricted metadata, but no monetary values are stored in this Sprint.

## Preparation for cost and payroll

Employee Record provides non-sensitive employment type, dates, weekly hours, manager relationship, and cost visibility. Future cost, profitability, and payroll modules must use separate permission-controlled records, effective-dated rules, audit logs, and explicit distinction between estimates and official confirmed payroll data.
