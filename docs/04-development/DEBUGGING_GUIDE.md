# NEXTTIME --- DEBUGGING GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide standardizes debugging practices across the STRATON platform,
enabling faster diagnosis, reproducible investigations, and safer fixes.

------------------------------------------------------------------------

# Debugging Workflow

1.  Reproduce the issue.
2.  Collect logs and context.
3.  Isolate the failing layer.
4.  Identify the root cause.
5.  Implement the smallest safe fix.
6.  Add or update tests.
7.  Document the resolution.

------------------------------------------------------------------------

# Logging

Log:

-   Authentication failures
-   Authorization failures
-   Server Action exceptions
-   External API failures
-   Unexpected runtime errors

Never log:

-   Passwords
-   Tokens
-   Service keys
-   Personal sensitive information

------------------------------------------------------------------------

# Frontend Debugging

Verify:

-   Browser console
-   Network requests
-   React DevTools
-   Component state
-   Hydration issues

------------------------------------------------------------------------

# Backend Debugging

Inspect:

-   Server Actions
-   Route Handlers
-   Repository layer
-   Validation flow
-   Business rules

Always reproduce with the same inputs before changing code.

------------------------------------------------------------------------

# Supabase

Check:

-   Session state
-   auth.getUser()
-   RLS policies
-   SQL results
-   Environment variables

------------------------------------------------------------------------

# Database

Validate:

-   Query plans
-   Index usage
-   Foreign keys
-   Migration history
-   Constraints

------------------------------------------------------------------------

# Error Handling

Prefer typed errors.

Include:

-   Error code
-   User-safe message
-   Internal log identifier

Avoid exposing stack traces to users.

------------------------------------------------------------------------

# Recommended Tools

-   Browser DevTools
-   Next.js logs
-   Supabase Dashboard
-   PostgreSQL query tools
-   Playwright
-   Vitest

------------------------------------------------------------------------

# Bug Report Checklist

-   Steps to reproduce
-   Expected behavior
-   Actual behavior
-   Screenshots (if applicable)
-   Logs
-   Browser/device
-   Environment
-   Related commit or PR

------------------------------------------------------------------------

# Resolution Checklist

-   Root cause confirmed
-   Fix reviewed
-   Tests updated
-   Regression verified
-   Documentation updated (if needed)

------------------------------------------------------------------------

# Goal

Create a consistent debugging process that reduces investigation time,
prevents regressions, and improves software quality.
