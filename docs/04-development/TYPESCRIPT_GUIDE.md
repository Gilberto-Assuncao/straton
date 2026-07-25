# STRATON --- TYPESCRIPT GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines the official TypeScript standards for the STRATON
project, ensuring type safety, maintainability, and consistency across
the codebase.

------------------------------------------------------------------------

# Compiler Configuration

-   Enable `strict` mode.
-   Enable `noUncheckedIndexedAccess`.
-   Enable `noImplicitOverride`.
-   Keep `skipLibCheck` only when necessary.

Never weaken compiler settings to bypass type errors.

------------------------------------------------------------------------

# General Principles

-   Prefer explicit typing.
-   Avoid `any`.
-   Use `unknown` when the type is not yet known.
-   Favor immutable data structures where practical.

------------------------------------------------------------------------

# Type vs Interface

Use `interface` for:

-   Object contracts
-   Component props
-   Public APIs

Use `type` for:

-   Unions
-   Utility compositions
-   Function signatures
-   Conditional types

------------------------------------------------------------------------

# Naming Conventions

-   Interfaces: `User`, `Project`
-   Types: `ProjectStatus`
-   Generics: `T`, `TData`, `TError`
-   Enums only when justified; prefer union string literals.

------------------------------------------------------------------------

# Generics

Use generics to maximize reuse.

Example:

``` ts
type ApiResponse<T> = {
  success: boolean;
  data: T;
};
```

Keep generic constraints simple and meaningful.

------------------------------------------------------------------------

# Utility Types

Prefer built-in utility types:

-   Partial`<T>`{=html}
-   Required`<T>`{=html}
-   Pick\<T, K\>
-   Omit\<T, K\>
-   Record\<K, T\>
-   ReturnType`<T>`{=html}

Avoid creating custom utilities when built-in ones solve the problem.

------------------------------------------------------------------------

# React Components

-   Strongly type props.
-   Avoid `React.FC` unless there is a specific reason.
-   Export prop interfaces alongside components.

------------------------------------------------------------------------

# Server Actions

-   Type input parameters.
-   Type return values.
-   Return predictable result objects.
-   Never return raw database errors.

------------------------------------------------------------------------

# Supabase Types

-   Generate database types from Supabase.
-   Reuse generated types.
-   Avoid manually duplicating schema definitions.

------------------------------------------------------------------------

# Error Handling

Represent expected errors using typed objects.

Example:

``` ts
type AppError = {
  code: string;
  message: string;
};
```

------------------------------------------------------------------------

# Code Review Checklist

-   No `any`
-   No unnecessary type assertions
-   No duplicated types
-   Strict mode passes
-   Types reused where possible
-   Public APIs fully typed

------------------------------------------------------------------------

# Goal

Maintain a robust, scalable, and self-documenting TypeScript codebase
that minimizes runtime errors and improves developer productivity.
