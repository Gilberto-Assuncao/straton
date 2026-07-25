# STRATON --- FRONTEND GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines the official frontend development standards for the
STRATON platform using Next.js 16, React, TypeScript and Tailwind CSS.

------------------------------------------------------------------------

# Technology Stack

-   Next.js 16 (App Router)
-   React
-   TypeScript (strict mode)
-   Tailwind CSS
-   Supabase SSR

------------------------------------------------------------------------

# Project Structure

    app/
    components/
    features/
    hooks/
    lib/
    services/
    types/
    styles/

Organize code by feature whenever practical. Keep shared UI inside
`components/`.

------------------------------------------------------------------------

# App Router

-   Prefer Server Components.
-   Use Client Components only when browser APIs or client-side state
    are required.
-   Keep layouts reusable.
-   Minimize nesting complexity.

------------------------------------------------------------------------

# Components

-   One responsibility per component.
-   Reusable before specialized.
-   Strongly typed props.
-   Avoid prop drilling; prefer composition.

------------------------------------------------------------------------

# TypeScript

-   Enable strict mode.
-   Avoid `any`.
-   Prefer explicit types.
-   Export reusable interfaces.

------------------------------------------------------------------------

# Styling

-   Tailwind utilities first.
-   Use design tokens.
-   No inline styles unless unavoidable.
-   Keep class names readable.

------------------------------------------------------------------------

# Data Fetching

-   Fetch on the server whenever possible.
-   Cache appropriately.
-   Handle loading and error states.
-   Validate external data.

------------------------------------------------------------------------

# Forms

-   Shared form components.
-   Client-side validation with server validation.
-   Accessible labels and error messages.

------------------------------------------------------------------------

# Performance

-   Lazy load heavy components.
-   Optimize images.
-   Minimize client bundles.
-   Avoid unnecessary re-renders.

------------------------------------------------------------------------

# Testing

-   Unit test reusable logic.
-   Integration test critical flows.
-   End-to-end test core user journeys.

------------------------------------------------------------------------

# Pull Request Checklist

-   Follows architecture
-   Passes lint
-   Passes type check
-   Passes tests
-   Uses design system
-   Updates documentation when required

------------------------------------------------------------------------

# Goal

Provide a consistent, maintainable and scalable frontend codebase
aligned with the STRATON architecture and design standards.
