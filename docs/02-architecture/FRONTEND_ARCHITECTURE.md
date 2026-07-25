# STRATON --- FRONTEND ARCHITECTURE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official frontend architecture of STRATON.

It establishes the standards for building scalable, maintainable and
performant user interfaces.

------------------------------------------------------------------------

# Technology Stack

-   Next.js 16 (App Router)
-   React
-   TypeScript (Strict)
-   Tailwind CSS

------------------------------------------------------------------------

# Design Principles

-   Server Components by default.
-   Client Components only when interactivity requires them.
-   Reusable UI over duplicated code.
-   Composition over inheritance.

------------------------------------------------------------------------

# Directory Organization

Routes live at the repository root in `app/`, not under `src/`. See [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for the authoritative, current layout (`src/domain`, `src/application`, `src/infrastructure`, `src/features`, `src/components`). There is no `src/hooks/` or `src/providers/` folder today — the one client session context that exists (`useSessionContext`) lives in `src/application/session/session-provider.tsx`.

------------------------------------------------------------------------

# Routing

-   App Router only (`app/`).
-   Layouts for shared UI (see `app/dashboard/layout.tsx` → `DashboardShell`).
-   Route protection through the root `proxy.ts` (Next.js 16's replacement for `middleware.ts`), not a `middleware.ts` file.

------------------------------------------------------------------------

# State Management

Priority:

1.  Server State
2.  React Context
3.  Local Component State

Avoid unnecessary global state.

------------------------------------------------------------------------

# UI Components

Components should be:

-   Small
-   Reusable
-   Typed
-   Accessible

------------------------------------------------------------------------

# Styling

-   Tailwind CSS
-   Design tokens
-   Shared UI primitives
-   Responsive-first

------------------------------------------------------------------------

# Performance

-   Minimize client bundles.
-   Lazy-load when beneficial.
-   Avoid unnecessary re-renders.
-   Cache server data whenever possible.

------------------------------------------------------------------------

# Goal

Provide a consistent frontend architecture that supports the long-term
evolution of STRATON.
