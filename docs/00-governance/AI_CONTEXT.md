# STRATON --- AI_CONTEXT.md

Version: 1.0 Status: Active Last Updated: 2026-07-21

------------------------------------------------------------------------

# Purpose

This document is the permanent architectural context for AI assistants
working on the STRATON project.

Read this file before making architectural decisions.

Do not rediscover information already documented here.

If this document conflicts with assumptions, this document is the source
of truth.

------------------------------------------------------------------------

# Project

**Name:** STRATON

**Type:** Multi-tenant SaaS

**Purpose:** Workforce management, employee time tracking, projects and
reporting.

**Target:** Any service business that manages people, time, and physical work locations — Construction, Cleaning, Electrical, HVAC, Security, Logistics, Hospitality, Facility Management, and similar segments. Construction remains a primary segment, not the only one — do not name entities, fields, or UI copy after construction-only vocabulary (e.g. use "Site", not "Chantier", for the physical-work-location entity).

------------------------------------------------------------------------

# Development Philosophy

The project prioritizes:

-   Simplicity
-   Performance
-   Scalability
-   Clean Architecture
-   Small Sprints
-   Low regression risk

Every implementation must preserve these principles.

------------------------------------------------------------------------

# Official Stack

## Frontend

-   Next.js 16 (App Router)
-   React
-   TypeScript (strict)
-   Tailwind CSS

## Backend

-   Supabase
-   PostgreSQL
-   Supabase Auth
-   Supabase Storage

## Development

-   Docker Desktop
-   GitHub
-   Turbopack

------------------------------------------------------------------------

# Architecture

The project follows a layered architecture.

    src/
    ├── application/
    ├── domain/
    ├── features/
    ├── infrastructure/
    └── components/

Do not introduce alternative architectures.

------------------------------------------------------------------------

# Authentication

Official implementation:

`src/application/session/`

Reuse:

-   `requireAuthenticatedSession()`
-   `getAuthenticatedSession()`

Never create another authentication flow.

------------------------------------------------------------------------

# Multi-tenancy

The active company defines the current workspace.

Always respect:

`requireActiveCompany()`

Never bypass company isolation.

------------------------------------------------------------------------

# Data Access Pattern

Use the existing pattern implemented by:

-   `src/features/companies/`
-   `src/features/teams/`

These modules are the architectural reference for future features.

Do not invent repositories, services or hooks unless explicitly
requested.

------------------------------------------------------------------------

# Session

The authenticated session is the official source for:

-   User
-   Company
-   Permissions
-   Roles

Never recreate user objects manually.

Never create mock users.

------------------------------------------------------------------------

# UI Architecture

Official App Shell:

`src/components/app-shell/`

Legacy dashboard components:

`components/dashboard/`

Legacy components must not be used for new implementations unless
explicitly requested.

------------------------------------------------------------------------

# Database

Official database:

Supabase PostgreSQL

Do not create local data stores.

Do not duplicate business data.

------------------------------------------------------------------------

# Mock Data

Goal:

Completely eliminate mock data.

Whenever replacing mock data:

-   Preserve UI
-   Preserve UX
-   Preserve routes

Replace only the data source.

------------------------------------------------------------------------

# Migrations

Database migrations must be:

-   Isolated
-   Reversible
-   Small

Do not mix schema changes and UI changes in the same Sprint whenever
possible.

------------------------------------------------------------------------

# Sprint Philosophy

One Sprint → One Objective → Small Scope → Easy Review → Easy Rollback

Avoid large refactors.

Avoid changing unrelated files.

------------------------------------------------------------------------

# Performance

Prefer:

-   Server Components
-   Cache
-   Streaming
-   Minimal client-side JavaScript

Avoid unnecessary re-renders.

------------------------------------------------------------------------

# TypeScript

Strict mode is mandatory.

Avoid `any`.

Prefer explicit types.

------------------------------------------------------------------------

# Code Style

Priorities:

1.  Readability
2.  Maintainability
3.  Predictability

Do not optimize prematurely.

------------------------------------------------------------------------

# Validation

Before completing a Sprint:

-   Typecheck
-   Lint
-   Build (when safe)

Confirm that only intended files were modified.

------------------------------------------------------------------------

# Git Rules

Never:

-   Commit
-   Push
-   Create branches

unless explicitly requested.

------------------------------------------------------------------------

# AI Behavior

Before coding:

-   Understand the Sprint objective.
-   Do not perform unnecessary architectural investigations if the
    answer already exists in this document.
-   Prefer reusing existing patterns over creating new abstractions.
-   If a decision impacts architecture, stop and explain before
    implementing.

------------------------------------------------------------------------

# Source of Truth

When in doubt, prioritize:

1.  AI_CONTEXT.md
2.  Existing production code
3.  Current Sprint instructions

Never assume architecture that does not already exist.
