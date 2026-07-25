# STRATON --- AUTHENTICATION

Version: 1.1 Status: Completed (Sprint 3.7 foundation) Last Updated: 2026-07-21

# Purpose

STRATON uses Supabase Auth through the official `@supabase/ssr` cookie pattern. It does not maintain a second credential or session system. See [AUTHORIZATION.md](AUTHORIZATION.md) for what happens after identity is established.

## Runtime flow

1. Email/password and OAuth submissions use Supabase Auth.
2. OAuth and email-confirmation codes return through `/auth/callback`, where the PKCE code is exchanged for a cookie session.
3. The root Next.js 16 `proxy.ts` refreshes Supabase cookies and performs only optimistic route redirects using verified claims.
4. Protected layouts and data-access functions call `auth.getUser()` on the server for authoritative session verification.
5. Supabase RLS remains the final authorization boundary for database access.

The login, registration, forgot-password, reset-password, logout, and enabled OAuth controls are connected. Forms use Server Actions for credential mutations, except OAuth initiation, which uses the official browser client because the provider redirects the browser.

## Route boundaries

Public routes include `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, and `/auth/callback`. Internal paths under `/dashboard` are protected. Compatibility prefixes `/workforce`, `/projects`, and `/settings` are also guarded if introduced as top-level routes later.

Unauthenticated internal requests redirect to `/login` with a validated relative return path. Authenticated users visiting login, registration, or forgot-password are redirected to `/dashboard`.

## Security rules

- Session tokens live only in Supabase-managed cookies.
- Passwords are sent directly to Supabase Auth and are never stored by STRATON.
- Server Actions and data access revalidate the user instead of trusting client state.
- The service-role client remains server-only and is not used by normal authentication flows.
- The Proxy is an optimistic redirect layer, not the sole authorization control.
- Errors shown for password reset do not disclose whether an account exists.

Environment values remain documented in `.env.example`; real credentials and service-role keys must never be committed.
