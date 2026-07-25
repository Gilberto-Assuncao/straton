# STRATON --- BUSINESS RULES

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official business rules for the STRATON
platform.

Business rules represent the operational logic of the platform and must
be consistently enforced across the application.

------------------------------------------------------------------------

# General Principles

-   Business rules are enforced on the server.
-   All actions must respect tenant isolation.
-   Rules must be deterministic and testable.
-   Every critical action should be auditable.

------------------------------------------------------------------------

# Time Tracking Rules

## BR-001 --- Time Entry Ownership

Employees may create and edit only their own time entries unless granted
elevated permissions.

Priority: High

------------------------------------------------------------------------

## BR-002 --- Time Overlap

An employee cannot have overlapping time entries for the same period.

Priority: High

------------------------------------------------------------------------

## BR-003 --- Valid Duration

Time entries must have:

-   Start time before end time
-   Positive duration
-   Valid working date

Priority: High

------------------------------------------------------------------------

# Timesheet Rules

## BR-004 --- Approval

Only authorized supervisors or managers may approve submitted
timesheets.

Priority: High

## BR-005 --- Locked Records

Approved timesheets become read-only unless reopened by an authorized
user.

Priority: High

------------------------------------------------------------------------

# Company Rules

## BR-006 --- Company is the tenant boundary

There is no separate "Tenant" entity above Company (see [../02-architecture/MULTITENANCY.md](../02-architecture/MULTITENANCY.md)). Every business record belongs to exactly one Company, carried as an explicit `company_id`. Data must never cross Company boundaries.

Priority: Critical — implemented via RLS on every tenant-owned table.

------------------------------------------------------------------------

# Team Rules

## BR-007 --- Team Membership

A Workforce Member may hold active memberships in multiple Teams simultaneously within the same Company — the schema (`team_memberships`) does not enforce a single "primary team." A membership link has a role (`leader`, `supervisor`, `member`) and a `left_at` marker preserving history when it ends.

Priority: Medium

------------------------------------------------------------------------

# Billing Rules (Planned — see [PRICING_STRATEGY.md](PRICING_STRATEGY.md), not implemented)

## BR-011 --- Billing unit

A Company can never be without an active Plan while it has active Workforce Members — on payment expiry it enters `past_due`, not a planless state.

## BR-012 --- Grace period before read-only

A Company in `past_due` for more than 15 consecutive days enters read-only mode: historical data stays visible and exportable, but no new Time Entry, Project, or Team can be created.

## BR-013 --- Downgrade guard

A plan downgrade can never execute if current usage exceeds the destination plan's limits (e.g. a Company with 40 concurrent Projects cannot downgrade to a plan that allows 5). This must be validated in both the UI and the Server Action layer — never trust UI validation alone.

## BR-014 --- Billing audit trail

Every billing-state change (upgrade, downgrade, member activation/deactivation, entering `past_due`) must generate an immutable audit record — these events are the basis for any future billing dispute.

Priority: Critical once implemented.

------------------------------------------------------------------------

# Project Rules

## BR-008 --- Active Projects

Time entries may only be associated with active projects.

Priority: High

------------------------------------------------------------------------

# Permission Rules

## BR-009 --- Role Enforcement

Every protected action requires permission validation before execution.

Priority: Critical

------------------------------------------------------------------------

# Audit Rules

## BR-010 --- Audit Trail

The following actions should be auditable:

-   Authentication events
-   Permission changes
-   Company updates
-   Project updates
-   Time approvals

Priority: High

------------------------------------------------------------------------

# Data Integrity

-   Foreign keys must remain valid.
-   Required relationships cannot be broken.
-   Deleted records should follow documented retention policies.

------------------------------------------------------------------------

# Validation

Business rules must be:

-   Covered by automated tests
-   Documented before implementation
-   Reviewed whenever requirements change

------------------------------------------------------------------------

# Goal

Provide a single, authoritative source for business rules, ensuring
consistent platform behavior and reliable implementation across all
STRATON modules.
