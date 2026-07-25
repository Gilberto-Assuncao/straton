# STRATON --- COMPONENT GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines the official standards for designing, implementing,
and maintaining React components in the STRATON platform.

------------------------------------------------------------------------

# Core Principles

-   Single Responsibility Principle
-   Composition over inheritance
-   Reusability before specialization
-   Accessibility by default
-   Predictable APIs
-   Strong TypeScript typing

------------------------------------------------------------------------

# Component Categories

## Shared Components

Reusable across the application.

Examples:

-   Button
-   Input
-   Select
-   Modal
-   Card
-   Badge
-   Avatar
-   Table
-   Tooltip

## Feature Components

Specific to a business domain.

Examples:

-   TimesheetEditor
-   ProjectSelector
-   CompanyCard
-   TeamCalendar

------------------------------------------------------------------------

# Folder Structure

    components/
      ui/
      layout/
      feedback/
      navigation/

    features/
      projects/
      teams/
      workforce/

Keep shared UI independent from business logic.

------------------------------------------------------------------------

# Component Structure

Each component should contain:

-   Component
-   Props interface
-   Internal helpers (if needed)
-   Minimal business logic
-   Tests (when applicable)

------------------------------------------------------------------------

# Props

Guidelines:

-   Use explicit interfaces.
-   Avoid boolean explosion.
-   Prefer composition over configuration.
-   Keep APIs predictable.

Example:

``` tsx
interface ButtonProps {
  variant: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}
```

------------------------------------------------------------------------

# Server vs Client Components

Default:

-   Server Components

Use Client Components only when:

-   Browser APIs are required
-   Local state is required
-   Event handlers are required

------------------------------------------------------------------------

# Composition

Prefer:

-   Children
-   Render props (when appropriate)
-   Small reusable building blocks

Avoid deeply nested component hierarchies.

------------------------------------------------------------------------

# Styling

-   Tailwind CSS
-   Design Tokens
-   Shared variants
-   No inline styles

------------------------------------------------------------------------

# Accessibility

Every interactive component must support:

-   Keyboard navigation
-   Visible focus
-   Screen readers
-   Proper ARIA attributes

------------------------------------------------------------------------

# Testing

Recommended tests:

-   Rendering
-   User interactions
-   Accessibility
-   Edge cases

------------------------------------------------------------------------

# Code Review Checklist

-   Reusable
-   Typed
-   Accessible
-   Responsive
-   Tested
-   Documented

------------------------------------------------------------------------

# Goal

Create a consistent, scalable, and maintainable component architecture
that supports rapid feature development while preserving the STRATON
Design System.
