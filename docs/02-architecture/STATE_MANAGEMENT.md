# STRATON --- STATE MANAGEMENT

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official state management strategy for the
STRATON platform.

The primary objective is to keep state simple, predictable and
performant while leveraging the capabilities of Next.js App Router.

------------------------------------------------------------------------

# Principles

-   Prefer Server Components whenever possible.
-   Minimize client-side state.
-   Keep a single source of truth.
-   Avoid duplicated state.
-   Fetch data close to where it is used.

------------------------------------------------------------------------

# Types of State

## Server State

Examples:

-   User profile
-   Companies
-   Teams
-   Projects
-   Timesheets

Characteristics:

-   Retrieved from Supabase
-   Cached when appropriate
-   Updated through server actions or route handlers

------------------------------------------------------------------------

## Client State

Used only for UI interactions.

Examples:

-   Open dialogs
-   Selected tabs
-   Form input
-   Theme preferences
-   Temporary filters

Client state should never replace server data.

------------------------------------------------------------------------

# React Context

Use Context only for truly global concerns.

Approved examples:

-   Authentication context
-   Theme
-   Locale
-   Notifications

Do not store large business datasets in Context.

------------------------------------------------------------------------

# Data Flow

Preferred flow:

User Action → Server Action / API → Database → Updated Server State → UI
Re-render

Avoid unnecessary client synchronization.

------------------------------------------------------------------------

# Caching

Use Next.js caching intentionally.

Guidelines:

-   Cache read-heavy resources.
-   Revalidate after mutations.
-   Avoid stale business data.

------------------------------------------------------------------------

# Forms

Forms should:

-   Validate on the client for UX.
-   Validate again on the server.
-   Return structured errors.

------------------------------------------------------------------------

# Performance

-   Keep components small.
-   Prevent unnecessary re-renders.
-   Memoize only when profiling justifies it.
-   Avoid deeply nested providers.

------------------------------------------------------------------------

# Anti-Patterns

Avoid:

-   Global mutable state
-   Duplicated server data
-   Excessive Context usage
-   Large client stores without justification

------------------------------------------------------------------------

# Goal

Provide a simple, scalable and maintainable state management strategy
aligned with Next.js, React and Supabase best practices.
