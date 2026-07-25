# STRATON --- VERSIONING

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official versioning strategy for the STRATON
project.

The objective is to ensure predictable releases, compatibility and
traceability across the entire platform.

------------------------------------------------------------------------

# Semantic Versioning

STRATON follows Semantic Versioning (SemVer):

MAJOR.MINOR.PATCH

## MAJOR

Increment when incompatible changes are introduced.

Examples:

-   Breaking API changes
-   Major architectural redesign
-   Database changes requiring migration

Example:

2.0.0

------------------------------------------------------------------------

## MINOR

Increment when new backward-compatible functionality is added.

Examples:

-   New module
-   New feature
-   New dashboard widget
-   Additional reports

Example:

1.4.0

------------------------------------------------------------------------

## PATCH

Increment for backward-compatible fixes.

Examples:

-   Bug fixes
-   UI improvements
-   Performance optimizations
-   Documentation corrections

Example:

1.4.3

------------------------------------------------------------------------

# Documentation Version

Governance documents may use independent versions.

Examples:

-   1.0
-   1.1
-   2.0

Documentation updates do not change the product version.

------------------------------------------------------------------------

# Database Version

Database schema changes must:

-   Be documented.
-   Have reversible migrations whenever possible.
-   Be linked to the corresponding Sprint.

------------------------------------------------------------------------

# API Version

Future public APIs should use explicit versioning.

Example:

/api/v1/

/api/v2/

Avoid breaking existing clients.

------------------------------------------------------------------------

# Release Rules

Before creating a release:

-   Typecheck passes
-   Lint passes
-   Build passes
-   Documentation updated
-   Changelog updated

------------------------------------------------------------------------

# Tags

Git tags must match the product version.

Examples:

v1.0.0

v1.2.0

v2.0.0

------------------------------------------------------------------------

# Goal

Maintain a clear, predictable and professional versioning strategy for
code, documentation, APIs and database evolution throughout the
lifecycle of STRATON.
