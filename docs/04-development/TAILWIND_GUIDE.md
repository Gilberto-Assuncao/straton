# STRATON --- TAILWIND GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines the official standards for using Tailwind CSS
throughout the STRATON platform, ensuring consistency, maintainability,
and performance.

------------------------------------------------------------------------

# Core Principles

-   Utility-first approach
-   Design Tokens first
-   Mobile-first development
-   Reusable UI patterns
-   Consistency over customization

------------------------------------------------------------------------

# Configuration

The Tailwind configuration must:

-   Consume Design Tokens
-   Avoid duplicated color definitions
-   Support Dark Mode by default
-   Keep plugins to the minimum required

------------------------------------------------------------------------

# Class Organization

Recommended order:

1.  Layout
2.  Flex/Grid
3.  Spacing
4.  Sizing
5.  Typography
6.  Colors
7.  Borders
8.  Effects
9.  Transitions
10. State modifiers

Example:

``` tsx
className="flex items-center gap-4 p-4 text-sm font-medium text-foreground bg-surface rounded-lg shadow transition hover:bg-primary"
```

------------------------------------------------------------------------

# Design Tokens

Never hardcode colors.

Use semantic utilities based on tokens:

-   background
-   foreground
-   surface
-   border
-   primary
-   muted

------------------------------------------------------------------------

# Responsiveness

Use mobile-first breakpoints.

Recommended prefixes:

-   sm
-   md
-   lg
-   xl
-   2xl

Avoid unnecessary responsive overrides.

------------------------------------------------------------------------

# States

Every interactive component should define:

-   hover
-   focus
-   active
-   disabled
-   loading (when applicable)

Focus indicators must always remain visible.

------------------------------------------------------------------------

# Components

Keep reusable styles inside shared components.

Avoid creating long repeated utility strings across multiple files.

------------------------------------------------------------------------

# Animations

Prefer:

-   transition
-   duration
-   ease-in-out

Reserve complex animations for Framer Motion when necessary.

------------------------------------------------------------------------

# Performance

-   Remove unused utilities in production.
-   Avoid excessive conditional class generation.
-   Prefer composition over deeply nested utility chains.

------------------------------------------------------------------------

# Code Review Checklist

-   Uses design tokens
-   Mobile-first
-   No inline styles
-   Consistent utility ordering
-   Accessible focus states
-   No duplicated utility groups

------------------------------------------------------------------------

# Goal

Provide a scalable Tailwind CSS architecture that keeps the STRATON
interface consistent, performant, and easy to maintain.
