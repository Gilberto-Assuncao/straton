# STRATON --- DEFINITION OF DONE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the minimum acceptance criteria required before
any task, Sprint or feature can be considered complete.

------------------------------------------------------------------------

# General Requirements

A task is considered Done only when all applicable criteria below are
satisfied.

------------------------------------------------------------------------

# Functional Completion

-   The requested functionality is fully implemented.
-   The implementation matches the approved Sprint objective.
-   No unfinished placeholder logic remains.

------------------------------------------------------------------------

# Code Quality

-   Code follows project standards.
-   Existing patterns are reused.
-   No unnecessary complexity or abstractions were introduced.
-   No duplicated logic.

------------------------------------------------------------------------

# TypeScript

-   Strict mode passes.
-   No `any` types were introduced.
-   No ignored type errors.

------------------------------------------------------------------------

# Validation

The following must succeed:

-   Typecheck
-   Lint
-   Build (when applicable)

No new warnings should be introduced without justification.

------------------------------------------------------------------------

# Regression Check

Verify that:

-   Existing features continue to work.
-   Authentication remains functional.
-   Navigation is unaffected.
-   No unrelated files were modified.

------------------------------------------------------------------------

# Documentation

If the Sprint changes architecture or workflow:

Update the relevant governance documents.

Examples:

-   PROJECT_DECISIONS.md
-   PROJECT_STRUCTURE.md
-   AI_CONTEXT.md

------------------------------------------------------------------------

# Git

Before completion:

``` bash
git diff
git status
```

Confirm:

-   Only expected files changed.
-   Working tree is understood.
-   No accidental modifications remain.

------------------------------------------------------------------------

# Sprint Report

Every Sprint must end with:

-   Summary
-   Files changed
-   Validation results
-   Risks
-   Limitations
-   Git status

------------------------------------------------------------------------

# Not Done If...

A task is NOT complete if:

-   Validation fails.
-   Scope is only partially implemented.
-   Hidden regressions are known.
-   Required documentation is missing.
-   Changes exceed the approved Sprint scope.

------------------------------------------------------------------------

# Goal

Ensure every completed Sprint leaves the STRATON codebase stable,
maintainable and ready for future development.
