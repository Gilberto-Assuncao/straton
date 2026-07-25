# STRATON --- USER PERSONAS

Version: 1.1 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the primary user personas for STRATON, ported from the detailed persona work in `Documentacao Projeto STRATON/STRATON_MASTER_DOCUMENTATION_7.md` (chapter 6) — the earlier generic draft of this file (Business Owner / Operations Manager / Team Supervisor / Field Employee) is replaced by the four named personas below, which are the ones actually used to resolve product conflicts.

------------------------------------------------------------------------

# Persona 1 --- Ana, Owner / Partner

Owner or partner of a ~60-person agency/consultancy. **Goal:** know, without waiting for month-end close, whether each Project is within its hour budget. **Current frustration:** discovers unprofitable projects only when finance closes the month — too late to correct allocation. **Usage pattern:** low frequency (checks reports weekly), high decision impact. **Modules used most:** Reports, Billing, cross-company Companies view. **What would make her abandon the product:** reports that don't reflect reality because managers don't approve Time Entries in time.

------------------------------------------------------------------------

# Persona 2 --- Bruno, Team Lead / Manager

Leads a Team of 8–15 Workforce Members, reports to Ana. **Goal:** approve Time Entries quickly and see team overload/idle capacity before it becomes a retention problem. **Current frustration:** spends hours manually approving time entries with no aggregate view of team capacity. **Usage pattern:** high frequency (near-daily). **Modules used most:** Time Tracking (approval queue), Teams, Workforce. **What would make him abandon the product:** a slow or unclear approval queue.

------------------------------------------------------------------------

# Persona 3 --- Camila, Workforce Member

Individual contributor (designer, developer, consultant) who logs time against Projects. **Goal:** log worked time as fast as possible and get back to real work. **Current frustration:** tools that require many redundant fields, or that "watch" her screen. **Usage pattern:** highest frequency of any persona (multiple times a day). **Modules used most:** Time Tracking. **What would make her abandon or game the product:** any sign of behavior monitoring (see [PRODUCT_VISION.md](PRODUCT_VISION.md) pillar 1), or a time entry flow requiring more than a few clicks.

> **Critical note:** Camila is the easiest persona to neglect (she doesn't buy the product) and the easiest to lose (she generates the data everything else depends on). No product decision should degrade Camila's experience to improve Ana's or Diego's.

------------------------------------------------------------------------

# Persona 4 --- Diego, Finance / Billing

Responsible for closing monthly billing, in-house or an outsourced accountant. **Goal:** close each client's invoice without hunting for data across spreadsheets, emails, and disconnected tools. **Current frustration:** must manually reconcile logged hours against approved hours before issuing any invoice. **Usage pattern:** concentrated at each billing-cycle close (monthly peaks). **Modules used most:** Billing, Reports. **What would make him abandon the product:** any divergence between the hours report and the calculated invoice amount.

------------------------------------------------------------------------

# Persona conflict resolution

| Conflict | Default resolution | Why |
| --- | --- | --- |
| More required Time Entry fields (good for Diego/reports) vs. fewer clicks (good for Camila) | Favor Camila | Without Camila's logged data, there is no report or invoice for Diego to process. |
| Multi-step approval (good for Ana, control) vs. simple/fast approval (good for Bruno, speed) | Favor Bruno for v1 | Custom approval workflows are explicitly out of scope for v1 (simplicity principle — see [../02-architecture/ARCHITECTURE_OVERVIEW.md](../02-architecture/ARCHITECTURE_OVERVIEW.md)). |
| Consolidated cross-company view (good for Ana in holding structures) vs. strict per-company isolation (security) | Favor isolation | Cross-company reporting is a Planned evolution ([../02-architecture/MULTITENANCY.md](../02-architecture/MULTITENANCY.md)) that must never compromise the tenant-isolation requirement. |

------------------------------------------------------------------------

# Persona 5 --- System Administrator

## Goals

-   Maintain platform security
-   Manage users and permissions
-   Support company administrators

## Responsibilities

-   Configure authentication
-   Manage roles
-   Audit system activity

## Pain Points

-   Permission complexity
-   Security risks
-   User management overhead

------------------------------------------------------------------------

# Shared Needs

All personas expect:

-   Fast performance
-   Mobile-friendly experience
-   Reliable data
-   Secure authentication
-   Clear and intuitive interface

------------------------------------------------------------------------

# Success Indicators

Users should be able to:

-   Complete common tasks quickly
-   Minimize manual work
-   Access accurate information
-   Collaborate efficiently
-   Trust the platform

------------------------------------------------------------------------

# Goal

Provide a clear understanding of the users served by STRATON, ensuring
product development remains focused on solving real business problems.
