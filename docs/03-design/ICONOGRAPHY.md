# STRATON --- ICONOGRAPHY

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official iconography guidelines for the
STRATON platform to ensure consistency, clarity, and accessibility
across all interfaces.

------------------------------------------------------------------------

# Official Icon Library

STRATON adopts **Lucide Icons** as the official icon set.

Reasons:

-   Lightweight
-   Open source
-   Consistent stroke style
-   Excellent React support
-   Tree-shakable
-   Active maintenance

------------------------------------------------------------------------

# Icon Sizes

  Context   Size
  --------- ----------
  Small     16px
  Default   20px
  Large     24px
  Hero      32--48px

------------------------------------------------------------------------

# Stroke Width

Default:

-   2px

Use the default Lucide stroke unless a specific component requires
otherwise.

------------------------------------------------------------------------

# Color Rules

Icons inherit the current text color whenever possible.

Semantic colors:

-   Success → Green
-   Warning → Amber
-   Error → Red
-   Info → Blue

Decorative icons should not introduce additional colors.

------------------------------------------------------------------------

# Usage by Context

## Navigation

-   Home
-   Dashboard
-   Companies
-   Teams
-   Projects
-   Reports
-   Settings

## Time Management

-   Clock
-   Calendar
-   Timer
-   Play
-   Pause
-   Stop

## User Management

-   User
-   Users
-   Shield
-   Key

## Actions

-   Plus
-   Pencil
-   Trash
-   Search
-   Filter
-   Download
-   Upload
-   Refresh

## Status

-   Check
-   AlertTriangle
-   XCircle
-   Info

------------------------------------------------------------------------

# Accessibility

-   Icons must never replace text when the meaning is unclear.
-   Decorative icons should use `aria-hidden="true"`.
-   Interactive icons require an accessible label.
-   Ensure sufficient contrast in all themes.

------------------------------------------------------------------------

# Implementation Guidelines

-   Import only the icons required by each component.
-   Wrap icons in a reusable `Icon` component when possible.
-   Avoid mixing multiple icon libraries.
-   Keep icon spacing consistent with design tokens.

------------------------------------------------------------------------

# Do's

-   Use icons to reinforce actions.
-   Keep visual consistency.
-   Prefer familiar metaphors.

# Don'ts

-   Do not use icons without purpose.
-   Do not rely on color alone to communicate meaning.
-   Do not mix filled and outlined styles.

------------------------------------------------------------------------

# Goal

Provide a unified iconography system that improves usability,
consistency, and maintainability across the STRATON ecosystem.
