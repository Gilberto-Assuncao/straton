# STRATON --- ACCESSIBILITY GUIDELINES

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document establishes the official accessibility standards for the
STRATON platform, ensuring an inclusive experience for all users and
compliance with WCAG 2.2 AA.

------------------------------------------------------------------------

# Accessibility Principles

-   Perceivable
-   Operable
-   Understandable
-   Robust

------------------------------------------------------------------------

# WCAG Compliance

Target compliance level:

-   WCAG 2.2 AA

------------------------------------------------------------------------

# Keyboard Navigation

All interactive elements must:

-   Be reachable with Tab
-   Support Shift+Tab navigation
-   Display a visible focus indicator
-   Be operable without a mouse

------------------------------------------------------------------------

# Focus Management

-   Move focus into dialogs when opened
-   Return focus to the triggering element when closed
-   Never trap focus unintentionally

------------------------------------------------------------------------

# Semantic HTML

Prefer native HTML elements:

-   button
-   input
-   label
-   nav
-   main
-   header
-   footer
-   table

Avoid replacing native controls unnecessarily.

------------------------------------------------------------------------

# Forms

Every form must provide:

-   Visible labels
-   Associated error messages
-   Required field indication
-   ARIA attributes where appropriate
-   Clear validation feedback

------------------------------------------------------------------------

# Color & Contrast

-   Meet WCAG AA contrast ratios
-   Never rely on color alone to communicate status
-   Pair colors with icons or text

------------------------------------------------------------------------

# Screen Readers

-   Use meaningful page titles
-   Provide accessible names
-   Mark decorative icons with aria-hidden="true"
-   Announce dynamic updates using ARIA live regions when appropriate

------------------------------------------------------------------------

# Tables

-   Use table headers (
    ```{=html}
    <th>
    ```
    )
-   Associate headers with data cells
-   Provide captions for complex tables
-   Preserve responsive usability

------------------------------------------------------------------------

# Dialogs & Modals

-   Use role="dialog" when appropriate
-   Support Escape to close
-   Restore focus after closing

------------------------------------------------------------------------

# Touch Targets

Minimum interactive target:

-   44 × 44 px

------------------------------------------------------------------------

# Responsive Accessibility

Interfaces must remain usable across:

-   Mobile
-   Tablet
-   Desktop
-   Large displays

------------------------------------------------------------------------

# Testing

Recommended tools:

-   Lighthouse
-   axe DevTools
-   Keyboard-only testing
-   Screen reader testing (NVDA, VoiceOver)

Accessibility should be verified before every production release.

------------------------------------------------------------------------

# Goal

Build an inclusive platform where every user can efficiently access and
use STRATON regardless of ability or assistive technology.
