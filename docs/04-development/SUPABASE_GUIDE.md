# STRATON --- SUPABASE GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines how Supabase must be used throughout the STRATON
platform, ensuring a secure, scalable, and consistent implementation.

------------------------------------------------------------------------

# Official Stack

-   Supabase Auth
-   PostgreSQL
-   Row Level Security (RLS)
-   Storage
-   Realtime (future use)
-   Edge Functions (when justified)
-   @supabase/ssr

------------------------------------------------------------------------

# Client Architecture

Maintain three distinct clients:

-   Browser Client
-   Server Client
-   Service Role Client (server-only)

Never expose the Service Role client to the browser.

------------------------------------------------------------------------

# Authentication

Authentication uses:

-   Supabase Auth
-   Secure HTTP-only cookies
-   PKCE flow
-   Server-side session validation

Always validate the authenticated user on the server.

------------------------------------------------------------------------

# Session Management

-   Refresh sessions through middleware/proxy.
-   Never rely solely on client-side state.
-   Redirect expired sessions to the login page.
-   Use auth.getUser() for authoritative verification.

------------------------------------------------------------------------

# Row Level Security

Rules:

-   Enable RLS on every application table.
-   Deny access by default.
-   Grant only the minimum required permissions.
-   Enforce tenant isolation in every policy.

------------------------------------------------------------------------

# Database Access

Use:

-   Typed queries
-   Repository layer
-   Parameterized filters
-   Explicit error handling

Avoid duplicated queries across the codebase.

------------------------------------------------------------------------

# Storage

Store only application assets such as:

-   Company logos
-   User avatars
-   Attachments
-   Generated reports

Validate file type and size before upload.

------------------------------------------------------------------------

# Realtime

Use Realtime only when it provides clear business value, such as:

-   Live timesheet updates
-   Presence indicators
-   Team collaboration

Avoid unnecessary subscriptions.

------------------------------------------------------------------------

# Edge Functions

Recommended for:

-   Third-party integrations
-   Scheduled jobs
-   Heavy backend processing
-   Secure webhooks

Do not move standard CRUD operations to Edge Functions.

------------------------------------------------------------------------

# Environment Variables

Typical variables:

-   NEXT_PUBLIC_SUPABASE_URL
-   NEXT_PUBLIC_SUPABASE_ANON_KEY
-   SUPABASE_SERVICE_ROLE_KEY

Never commit secrets to the repository.

------------------------------------------------------------------------

# Security

-   Validate users on the server.
-   Never expose service-role credentials.
-   Use HTTPS exclusively.
-   Log critical authentication failures.
-   Apply least-privilege access.

------------------------------------------------------------------------

# Performance

-   Select only required columns.
-   Paginate large datasets.
-   Minimize nested queries.
-   Reuse clients whenever possible.

------------------------------------------------------------------------

# Goal

Provide a standardized approach for integrating Supabase across the
STRATON platform while maintaining security, performance, and long-term
maintainability.
