# STRATON --- DEVELOPMENT_RULES

Version: 1.0

## Objective

These rules are mandatory for every implementation.

## General

-   Keep Sprints small.
-   One objective per Sprint.
-   Do not change unrelated files.
-   Preserve existing functionality.

## Git

-   Always check `git status`.
-   Confirm current branch.
-   Never commit unless explicitly requested.
-   Never push unless explicitly requested.
-   Never create branches unless requested.

## Code

-   TypeScript strict.
-   Avoid `any`.
-   Reuse existing patterns.
-   Do not duplicate logic.
-   Prefer Server Components.

## Database

-   Use Supabase.
-   Keep migrations isolated.
-   Never mix schema changes with UI changes.

## Validation

Run: - Typecheck - Lint - Build (when safe)

Confirm only intended files changed.

## Reporting

Always report: - Files changed - Validations executed - Risks - Final
git status
