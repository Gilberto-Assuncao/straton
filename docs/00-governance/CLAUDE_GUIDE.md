# STRATON --- CLAUDE GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines how Claude Code must work inside the STRATON
project.

It complements:

-   AI_CONTEXT.md
-   DEVELOPMENT_RULES.md
-   PROJECT_STRUCTURE.md
-   PROJECT_DECISIONS.md
-   SPRINT_TEMPLATE.md

These documents are the official source of truth.

------------------------------------------------------------------------

# Claude's Role

Claude Code is responsible for:

-   Code implementation
-   Refactoring
-   Bug fixing
-   Static analysis
-   Validation
-   Technical recommendations

Claude must not make architectural decisions without approval.

------------------------------------------------------------------------

# Mandatory Workflow

## 1. Read the documentation

Always read:

-   AI_CONTEXT.md
-   DEVELOPMENT_RULES.md
-   PROJECT_STRUCTURE.md
-   PROJECT_DECISIONS.md
-   Current Sprint instructions

------------------------------------------------------------------------

## 2. Repository Audit

Execute:

``` bash
git status
git branch --show-current
```

Confirm:

-   Current branch
-   Working tree state

------------------------------------------------------------------------

## 3. Understand the Sprint

Identify:

-   Objective
-   Allowed files
-   Forbidden files
-   Risks
-   Dependencies

If anything is unclear, stop and ask.

------------------------------------------------------------------------

## 4. Minimize Changes

Modify only the required files.

Never refactor unrelated code.

Never rename files without approval.

------------------------------------------------------------------------

## 5. Reuse Existing Patterns

Priority:

1.  Companies
2.  Teams
3.  Existing production code

Avoid creating new abstractions.

------------------------------------------------------------------------

# Architecture Rules

Do not create:

-   New layers
-   Generic repositories
-   Generic services
-   Utility abstractions

unless explicitly requested.

------------------------------------------------------------------------

# Database Rules

Do not change schema without approval.

Migrations must be:

-   Small
-   Isolated
-   Reversible

------------------------------------------------------------------------

# TypeScript

Mandatory:

-   Strict mode
-   Explicit types
-   No any

------------------------------------------------------------------------

# Performance

Prefer:

-   Server Components
-   Cached queries
-   Existing Session Context
-   Existing Providers

Avoid duplicated queries and unnecessary client code.

------------------------------------------------------------------------

# Validation

Run:

-   Typecheck
-   Lint
-   Build (when safe)

Then:

``` bash
git diff
git status
```

------------------------------------------------------------------------

# Report Format

Always provide:

-   Summary
-   Files changed
-   Validation
-   Risks
-   Limitations
-   Git status

------------------------------------------------------------------------

# Git Policy

Never:

-   Commit
-   Push
-   Create branches
-   Merge

unless explicitly requested.

------------------------------------------------------------------------

# Decision Policy

If an architectural decision is required:

Stop.

Explain:

-   Problem
-   Options
-   Recommendation

Wait for approval.

------------------------------------------------------------------------

# Objective

Produce clean, predictable and maintainable code while minimizing
regression risk.
