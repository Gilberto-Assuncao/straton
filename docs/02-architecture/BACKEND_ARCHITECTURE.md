# STRATON --- BACKEND ARCHITECTURE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official backend architecture for the STRATON
platform.

The backend is designed around a scalable, secure and maintainable SaaS
architecture.

------------------------------------------------------------------------

# Technology Stack

-   Supabase
-   PostgreSQL
-   Next.js Route Handlers
-   Server Components
-   TypeScript (Strict)

------------------------------------------------------------------------

# Core Responsibilities

The backend is responsible for:

-   Authentication
-   Authorization
-   Data persistence
-   Business rules
-   File storage
-   Auditability

------------------------------------------------------------------------

# Architectural Layers

## Domain

Business entities and rules.

## Application

Use cases and orchestration.

## Infrastructure

Supabase integration, repositories and external services.

------------------------------------------------------------------------

# Database

Supabase PostgreSQL is the single source of truth.

Rules:

-   Normalized schema
-   Foreign keys enforced
-   Row Level Security (RLS)
-   Timestamp columns
-   Soft delete only when justified

------------------------------------------------------------------------

# Authentication

-   Supabase Auth
-   Secure server-side session validation
-   Protected routes through the root `proxy.ts` (Next.js 16's replacement for `middleware.ts`)
-   SSR-first authentication

------------------------------------------------------------------------

# Authorization

Access is based on (see [MULTITENANCY.md](MULTITENANCY.md) — Company is the tenant boundary, not a separate Tenant entity):

-   Company
-   User (via company membership)
-   Role
-   Permissions

All authorization must be enforced on the server.

------------------------------------------------------------------------

# API Guidelines

-   Route Handlers for server endpoints.
-   JSON responses.
-   Consistent error handling.
-   Explicit HTTP status codes.

------------------------------------------------------------------------

# Error Handling

-   Validate input.
-   Never expose internal errors.
-   Log unexpected failures.
-   Return predictable responses.

------------------------------------------------------------------------

# Performance

-   Minimize database queries.
-   Prefer server execution.
-   Reuse sessions.
-   Cache safe data when appropriate.

------------------------------------------------------------------------

# Security

-   Row Level Security enabled.
-   Input validation.
-   Parameterized queries.
-   Principle of least privilege.

------------------------------------------------------------------------

# Goal

Provide a secure, scalable and maintainable backend foundation capable
of supporting the long-term growth of STRATON.
