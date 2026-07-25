# STRATON --- TECH DECISIONS

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document records the major architectural and technical decisions
made throughout the STRATON project.

Its objective is to preserve context, document trade-offs, and help
future contributors understand why specific technologies and patterns
were adopted.

------------------------------------------------------------------------

# Decision Process

Every significant architectural decision should:

-   Solve a real problem.
-   Consider alternatives.
-   Document advantages and disadvantages.
-   Be reviewed before adoption.
-   Remain available for future reference.

Major decisions should be added as Architecture Decision Records (ADRs).

------------------------------------------------------------------------

# ADR-001 --- Next.js 16

Decision:

Use Next.js 16 with the App Router.

Reasons:

-   Server-first architecture
-   Excellent React integration
-   Built-in routing
-   Server Components
-   Streaming support
-   Strong ecosystem

Alternatives considered:

-   Remix
-   Nuxt
-   SvelteKit

------------------------------------------------------------------------

# ADR-002 --- TypeScript

Decision:

Use TypeScript in strict mode.

Reasons:

-   Strong typing
-   Better maintainability
-   Improved developer experience
-   Reduced runtime errors

Alternative:

-   JavaScript

------------------------------------------------------------------------

# ADR-003 --- Supabase

Decision:

Use Supabase as the Backend-as-a-Service.

Reasons:

-   PostgreSQL
-   Authentication
-   Row Level Security (RLS)
-   Storage
-   Real-time capabilities
-   Excellent Next.js integration

Alternatives considered:

-   Firebase
-   Appwrite
-   PocketBase

------------------------------------------------------------------------

# ADR-004 --- PostgreSQL

Decision:

Use PostgreSQL as the primary database.

Reasons:

-   Mature ecosystem
-   ACID compliance
-   Scalability
-   Advanced indexing
-   Excellent relational modeling

------------------------------------------------------------------------

# ADR-005 --- Tailwind CSS

Decision:

Use Tailwind CSS.

Reasons:

-   Utility-first workflow
-   Fast development
-   Consistent design system
-   Small production bundles

Alternative:

-   CSS Modules
-   Styled Components

------------------------------------------------------------------------

# ADR-006 --- Multi-Tenant Architecture

Decision:

Adopt a shared-database, logical multi-tenant model.

Reasons:

-   Efficient resource usage
-   Simpler operations
-   Lower infrastructure cost
-   Supported by RLS

------------------------------------------------------------------------

# Future ADRs

Future decisions should follow the same structure:

-   Context
-   Decision
-   Alternatives
-   Consequences
-   References

------------------------------------------------------------------------

# Review Policy

Architectural decisions may evolve as the platform grows.

Changes should occur only when supported by clear technical or business
evidence.

------------------------------------------------------------------------

# Goal

Maintain a transparent history of architectural decisions, enabling
consistent technical evolution and preserving project knowledge over
time.
