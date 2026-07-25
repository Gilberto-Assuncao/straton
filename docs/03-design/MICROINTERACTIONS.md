# STRATON --- MICROINTERACTIONS

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official microinteraction guidelines for
STRATON, ensuring every user action receives clear, consistent and
meaningful feedback.

------------------------------------------------------------------------

# Principles

-   Immediate feedback
-   Subtle animations
-   Purpose over decoration
-   Performance first
-   Accessibility by default

------------------------------------------------------------------------

# Interaction States

Every interactive component should define:

-   Default
-   Hover
-   Focus
-   Active / Pressed
-   Disabled
-   Loading
-   Success
-   Error

------------------------------------------------------------------------

# Motion Guidelines

Default durations:

-   Fast: 150ms
-   Standard: 250ms
-   Slow: 400ms

Preferred easing:

-   ease-out
-   ease-in-out

Avoid animations longer than 500ms for standard UI interactions.

------------------------------------------------------------------------

# Buttons

Hover: - Slight elevation or background change.

Pressed: - Reduced scale (98%) or subtle shadow change.

Loading: - Replace label with spinner while preserving width.

Success: - Optional checkmark animation.

------------------------------------------------------------------------

# Forms

-   Highlight focused fields.
-   Validate inline when appropriate.
-   Animate error messages without shifting layout excessively.
-   Success feedback should be immediate.

------------------------------------------------------------------------

# Navigation

-   Smooth sidebar expansion/collapse.
-   Active menu items clearly highlighted.
-   Breadcrumb transitions should be minimal.

------------------------------------------------------------------------

# Cards & Lists

-   Hover elevation on desktop only.
-   Preserve stable layouts.
-   Expand/collapse sections with smooth height transitions.

------------------------------------------------------------------------

# Notifications

Toast messages should:

-   Slide/fade into view.
-   Auto-dismiss after a short delay.
-   Pause dismissal while hovered.

------------------------------------------------------------------------

# Loading Patterns

Preferred order:

1.  Skeletons
2.  Inline progress indicators
3.  Full-page loaders only when unavoidable

------------------------------------------------------------------------

# Drag & Drop

Provide visual feedback for:

-   Draggable items
-   Valid drop targets
-   Invalid drop targets
-   Successful drop completion

------------------------------------------------------------------------

# Accessibility

-   Respect reduced motion preferences.
-   Never communicate status through animation alone.
-   Preserve keyboard usability during transitions.

------------------------------------------------------------------------

# Implementation

Recommended technologies:

-   CSS transitions
-   Tailwind transition utilities
-   Framer Motion (complex interactions only)

Avoid unnecessary JavaScript animations.

------------------------------------------------------------------------

# Goal

Create responsive, intuitive and polished interactions that improve
usability without distracting users.
