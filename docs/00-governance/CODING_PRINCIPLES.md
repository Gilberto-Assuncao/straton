# STRATON --- CODING PRINCIPLES

Version: 1.1 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the coding principles that every contributor and AI must follow when implementing features in STRATON.

------------------------------------------------------------------------

# Mandatory baseline

- TypeScript strict mode for all application code; never use `any` — model unknown input as `unknown` and narrow it.
- No `@ts-ignore`, broad ESLint disables, or unsafe assertions to hide defects.
- Prefer `import type` for type-only dependencies.
- Names stay consistent, descriptive, and aligned with domain language.
- Comments explain non-obvious intent or constraints — never restate the code.

------------------------------------------------------------------------

# Structure and reuse

- Search for an existing component, hook, type, utility, or `src/features/*` module before creating a new one.
- Keep components and functions focused; split by responsibility, not by an arbitrary line count.
- Prefer composition, typed props, and explicit dependencies over inheritance and global state.
- Never duplicate a component or a business rule.
- Keep framework-independent logic (`src/domain`) outside React/Next.js components.
- Server Components by default; add `"use client"` only for interaction, effects, or browser APIs.

------------------------------------------------------------------------

# Data and errors

- Validate untrusted boundaries on the server. Never trust a tenant, role, price, approval, or user identifier supplied by the client — re-derive it from `requireActiveCompany()`/session.
- Use explicit result/status types; distinguish empty, loading, error, unauthorized, and not-found states.
- Use deterministic date, timezone, currency, and unit handling.
- Mock/demo data must be clearly labeled and must never resemble production secrets or personal records.

------------------------------------------------------------------------

# Styling

- Tailwind CSS only; reuse design tokens (`src/design-system/tokens.ts`); avoid duplicated utility combinations when a reusable component already exists.

------------------------------------------------------------------------

# Quality

Avoid premature abstractions and speculative dependencies. Optimize only after measurement, but prevent obvious unnecessary client bundles, repeated queries, unstable keys, uncontrolled re-renders, and page-level horizontal overflow.

------------------------------------------------------------------------

# Validation before considering a task complete

- Typecheck passes.
- Lint passes.
- Build passes (when applicable).

------------------------------------------------------------------------

# Objective

Every line of code should make STRATON easier to understand, safer to change, and simpler to maintain.
