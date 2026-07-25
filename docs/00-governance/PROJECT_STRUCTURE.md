# STRATON --- PROJECT_STRUCTURE

Version: 1.0 Status: Living Document Last Updated: 2026-07-21

------------------------------------------------------------------------

# Purpose

This document describes the official project structure.

AI assistants must consult this document before exploring the
repository.

If a folder or pattern is documented here, do not rediscover it.

------------------------------------------------------------------------

# High-Level Architecture

    src/
    ├── application/
    ├── domain/
    ├── features/
    ├── infrastructure/
    └── components/

## application/

Application services and orchestration.

Examples:

-   Session
-   Authorization
-   Business workflows

Do not place UI here.

------------------------------------------------------------------------

## domain/

Pure business rules.

Contains:

-   Entities
-   Value Objects
-   Domain Types
-   Domain Logic

No framework code.

------------------------------------------------------------------------

## infrastructure/

External integrations.

Examples:

-   Supabase
-   Database
-   Storage
-   External APIs

------------------------------------------------------------------------

## features/

Business modules.

Each feature owns:

-   data.ts
-   types
-   server queries
-   feature-specific components

Reference implementations:

-   src/features/companies
-   src/features/teams

Future features must follow the same structure.

------------------------------------------------------------------------

## components/

Reusable UI.

Shared visual components only.

Avoid business logic.

------------------------------------------------------------------------

# Official App Shell

Current application shell:

    src/components/app-shell/

Responsible for:

-   Navigation
-   Sidebar
-   User menu
-   Session context
-   Layout

------------------------------------------------------------------------

# Legacy Components

    components/dashboard/

Status:

LEGACY

These components are not the reference implementation.

Do not use them for new development unless explicitly requested.

------------------------------------------------------------------------

# Authentication Flow

Official source:

    src/application/session/

Use:

-   requireAuthenticatedSession()
-   getAuthenticatedSession()

Never create parallel authentication implementations.

------------------------------------------------------------------------

# Active Company

Current workspace is determined by:

    requireActiveCompany()

Every feature must respect company isolation.

------------------------------------------------------------------------

# Data Access Pattern

Standard:

    Feature
        ↓
    data.ts
        ↓
    Supabase Server Client
        ↓
    Database

Avoid additional abstraction layers unless approved.

------------------------------------------------------------------------

# Database

Official database:

-   Supabase
-   PostgreSQL

No local business database.

------------------------------------------------------------------------

# Mock Data

Goal:

Replace all mock data while preserving:

-   Routes
-   Components
-   User experience

Only replace the data source.

------------------------------------------------------------------------

# Migrations

Keep migrations:

-   Small
-   Independent
-   Reversible

Prefer one migration per Sprint.

------------------------------------------------------------------------

# Validation Checklist

Before completing a Sprint:

-   git status
-   Typecheck
-   Lint
-   Build (when safe)
-   git diff

------------------------------------------------------------------------

# Future Updates

Update this document whenever:

-   A new architectural pattern is adopted.
-   A folder changes responsibility.
-   A legacy module is removed.
-   A new official reference implementation is introduced.
