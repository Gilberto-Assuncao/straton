# STRATON --- SECURITY ARCHITECTURE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official security architecture for the STRATON
platform.

Security is a foundational requirement and must be considered in every
layer of the application, from the user interface to the database and
infrastructure.

------------------------------------------------------------------------

# Security Principles

-   Secure by default
-   Least privilege
-   Defense in depth
-   Zero trust
-   Fail securely
-   Continuous monitoring

------------------------------------------------------------------------

# Authentication

Authentication is handled through Supabase Auth.

Requirements:

-   Secure session management
-   Server-side session validation
-   Optional Multi-Factor Authentication (future)
-   Secure password policies
-   Session expiration handling

------------------------------------------------------------------------

# Authorization

Authorization must always be enforced on the server.

Access decisions are based on (see [MULTITENANCY.md](MULTITENANCY.md) — Company is the tenant, there is no separate Tenant entity):

-   Company (the tenant boundary)
-   User role (via company membership)
-   Assigned permissions

Client-side checks are for UX only and must never be trusted.

------------------------------------------------------------------------

# Database Security

All business tables must:

-   Enable Row Level Security (RLS)
-   Restrict access by `company_id` (the tenant boundary — see MULTITENANCY.md)
-   Validate ownership
-   Use parameterized queries

Direct database access from the client must be minimized.

------------------------------------------------------------------------

# API Security

All protected endpoints must:

-   Require authentication
-   Validate authorization
-   Validate input
-   Return standardized errors
-   Never expose internal implementation details

Rate limiting should be considered for public endpoints.

------------------------------------------------------------------------

# Secrets Management

Secrets must:

-   Never be committed to Git
-   Be stored using environment variables
-   Be rotated periodically
-   Follow the principle of least access

Examples:

-   API keys
-   Database credentials
-   Service tokens

------------------------------------------------------------------------

# Secure Development

Developers should:

-   Review dependencies regularly
-   Keep packages updated
-   Validate all user input
-   Escape untrusted output
-   Avoid hard-coded credentials

------------------------------------------------------------------------

# Logging & Auditing

Security logs should include:

-   Authentication events
-   Authorization failures
-   Administrative actions
-   Critical configuration changes

Sensitive information must never appear in logs.

------------------------------------------------------------------------

# Compliance

The platform should be designed to support:

-   GDPR
-   LGPD
-   Secure data retention
-   User data deletion requests
-   Audit requirements

------------------------------------------------------------------------

# Incident Response

Security incidents should include:

1.  Detection
2.  Containment
3.  Investigation
4.  Recovery
5.  Post-incident review

Document lessons learned after every incident.

------------------------------------------------------------------------

# Goal

Provide a secure, scalable and resilient security architecture that
protects customer data, supports regulatory compliance and enables
long-term growth of the STRATON platform.
