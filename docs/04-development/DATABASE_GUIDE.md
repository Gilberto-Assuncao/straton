# STRATON --- DATABASE GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines the official standards for designing, implementing,
and maintaining the STRATON database using PostgreSQL and Supabase.

------------------------------------------------------------------------

# Database Principles

-   Normalize data where appropriate.
-   Use UUIDs as primary keys.
-   Prefer explicit relationships.
-   Protect all data with Row Level Security (RLS).
-   Keep business logic outside the database unless performance or
    integrity requires otherwise.

------------------------------------------------------------------------

# Naming Conventions

## Tables

-   Use lowercase snake_case.
-   Prefer plural names (e.g., companies, projects, users).

## Columns

-   Lowercase snake_case.
-   Foreign keys end with `_id`.

## Indexes

-   Prefix with `idx_`.

## Constraints

-   Prefix with `pk_`, `fk_`, `uq_`, or `chk_`.

------------------------------------------------------------------------

# Schemas

Default schemas:

-   auth (managed by Supabase)
-   public (application data)

Future enterprise schemas must be documented before use.

------------------------------------------------------------------------

# Keys

-   Primary keys: UUID
-   Foreign keys: Required where relationships exist
-   Use cascading deletes only when explicitly justified

------------------------------------------------------------------------

# Indexing

Create indexes for:

-   Foreign keys
-   Frequently filtered columns
-   Sorting columns
-   Searchable fields

Review index usage periodically.

------------------------------------------------------------------------

# Migrations

Rules:

-   Every schema change uses a migration.
-   Migrations must be idempotent when possible.
-   Never edit an executed migration.
-   Use descriptive migration names.

------------------------------------------------------------------------

# Row Level Security

-   Enable RLS on every application table.
-   Deny access by default.
-   Grant minimum required permissions.
-   Validate tenant ownership in every policy.

------------------------------------------------------------------------

# Audit & Logging

Audit important events:

-   User creation
-   Authentication changes
-   Permission changes
-   Critical business operations

Avoid storing sensitive information in logs.

------------------------------------------------------------------------

# Performance

-   Optimize queries before adding indexes.
-   Avoid unnecessary joins.
-   Use pagination for large datasets.
-   Monitor slow queries.

------------------------------------------------------------------------

# Backup & Recovery

-   Use Supabase managed backups.
-   Test recovery procedures regularly.
-   Document restore processes.

------------------------------------------------------------------------

# Goal

Provide a secure, scalable, and maintainable database foundation for the
STRATON platform.
