# STRATON --- UI PATTERNS

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official user interface (UI) patterns for
STRATON. These patterns ensure a consistent user experience across all
web and future mobile applications.

------------------------------------------------------------------------

# Core Principles

-   Consistency over creativity
-   Simplicity first
-   Progressive disclosure
-   Mobile-first design
-   Accessibility by default
-   Predictable interactions

------------------------------------------------------------------------

# Page Structure

Each page should follow this layout:

1.  Page title
2.  Optional description
3.  Primary action
4.  Filters / Search
5.  Main content
6.  Secondary actions
7.  Pagination (if applicable)

------------------------------------------------------------------------

# Dashboard Pattern

Dashboard pages should contain:

-   KPI cards
-   Charts
-   Recent activity
-   Quick actions
-   Alerts
-   Upcoming tasks

------------------------------------------------------------------------

# CRUD Pattern

Standard flow:

-   List
-   Search
-   Filter
-   Create
-   Edit
-   View details
-   Delete (with confirmation)

------------------------------------------------------------------------

# Forms

Guidelines:

-   Single-column on mobile
-   Logical field grouping
-   Inline validation
-   Clear required fields
-   Primary action at the bottom
-   Cancel action always available

------------------------------------------------------------------------

# Tables

Requirements:

-   Search
-   Sorting
-   Filtering
-   Pagination
-   Bulk actions
-   Responsive card view on mobile

------------------------------------------------------------------------

# Empty States

Every empty state should include:

-   Illustration or icon
-   Clear explanation
-   Primary call-to-action

Example:

"No projects yet. Create your first project."

------------------------------------------------------------------------

# Loading States

Preferred order:

1.  Skeleton screens
2.  Inline loaders
3.  Full-page loading (only when necessary)

------------------------------------------------------------------------

# Error States

Every error should include:

-   Plain language
-   Recovery suggestion
-   Retry action when possible

Avoid exposing technical details.

------------------------------------------------------------------------

# Success Feedback

Use:

-   Toast notifications
-   Success banners
-   Inline confirmations

Feedback should be immediate and concise.

------------------------------------------------------------------------

# Destructive Actions

Actions such as delete or archive must:

-   Require confirmation
-   Clearly explain consequences
-   Highlight the primary irreversible action

------------------------------------------------------------------------

# Search & Filters

-   Search should be available where datasets grow.
-   Filters should be collapsible on mobile.
-   Preserve user selections during navigation.

------------------------------------------------------------------------

# Notifications

Toast messages should:

-   Auto-dismiss after a few seconds
-   Be dismissible manually
-   Use semantic colors

------------------------------------------------------------------------

# Goal

Provide repeatable UI patterns that improve usability, reduce cognitive
load, and create a cohesive experience throughout the STRATON platform.
