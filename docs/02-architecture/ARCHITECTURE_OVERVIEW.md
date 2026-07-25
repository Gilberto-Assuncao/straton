# STRATON --- ARCHITECTURE OVERVIEW

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document provides a high-level view of the STRATON architecture and
serves as the primary entry point for understanding the platform.

------------------------------------------------------------------------

# Platform Overview

STRATON is a multi-tenant SaaS platform for workforce, time tracking and
project management.

Technology stack:

-   Next.js 16 (App Router)
-   React
-   TypeScript (Strict)
-   Tailwind CSS
-   Supabase
-   PostgreSQL

------------------------------------------------------------------------

# High-Level Architecture

``` text
Users
   │
   ▼
Next.js Application
   │
   ├── Server Components
   ├── Client Components
   ├── Route Handlers
   └── Server Actions
   │
   ▼
Supabase Services
   ├── Authentication
   ├── PostgreSQL
   ├── Storage
   └── Row Level Security
```

------------------------------------------------------------------------

# Core Architectural Principles

-   Server-first rendering
-   Multi-tenant by design
-   Secure by default
-   Strong typing
-   Modular organization
-   Scalable architecture
-   Documentation-driven development

------------------------------------------------------------------------

# Main Domains

-   Authentication
-   Companies
-   Teams
-   Workforce
-   Projects
-   Time Tracking
-   Reports
-   Settings

Each domain evolves independently while following shared architectural
standards.

------------------------------------------------------------------------

# Data Flow

1.  User performs an action.
2.  Request is validated.
3.  Authentication and authorization are verified.
4.  Business rules execute.
5.  Database is updated or queried.
6.  Response is returned.
7.  UI refreshes with the latest state.

------------------------------------------------------------------------

# Cross-Cutting Concerns

The following apply across all modules:

-   Security
-   Observability
-   Performance
-   Error handling
-   Testing
-   Deployment
-   Scalability

------------------------------------------------------------------------

# Related Architecture Documents

-   SYSTEM_OVERVIEW.md
-   FRONTEND_ARCHITECTURE.md
-   BACKEND_ARCHITECTURE.md
-   DATABASE_ARCHITECTURE.md
-   AUTHENTICATION.md
-   AUTHORIZATION.md
-   MULTITENANCY.md
-   API_CONVENTIONS.md
-   STATE_MANAGEMENT.md
-   ERROR_HANDLING.md
-   FILE_STRUCTURE.md
-   TESTING_STRATEGY.md
-   DEPLOYMENT_ARCHITECTURE.md
-   SECURITY_ARCHITECTURE.md
-   OBSERVABILITY.md
-   PERFORMANCE_GUIDELINES.md
-   SCALABILITY_ARCHITECTURE.md
-   TECH_DECISIONS.md

------------------------------------------------------------------------

# Evolution

Architecture should evolve incrementally through documented decisions
(ADRs), avoiding unnecessary rewrites while preserving maintainability.

------------------------------------------------------------------------

# Goal

Provide a single reference that connects every architectural document
and offers developers a clear understanding of the STRATON platform.
