# STRATON --- DESIGN REVIEW CHECKLIST

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This checklist defines the mandatory review criteria for all user
interface changes before merge and release. It ensures every screen
follows the STRATON Design System and delivers a consistent user
experience.

------------------------------------------------------------------------

# Visual Consistency

-   [ ] Uses official color palette
-   [ ] Uses approved typography
-   [ ] Uses design tokens only
-   [ ] Correct spacing and alignment
-   [ ] Consistent border radius
-   [ ] Icons follow ICONOGRAPHY.md

------------------------------------------------------------------------

# Component Usage

-   [ ] Reuses existing components
-   [ ] No duplicated UI components
-   [ ] Correct component variants
-   [ ] Generic components contain no business logic

------------------------------------------------------------------------

# Layout & Responsiveness

-   [ ] Mobile-first layout
-   [ ] Tablet verified
-   [ ] Desktop verified
-   [ ] Ultrawide verified
-   [ ] No horizontal scrolling
-   [ ] Responsive tables and forms

------------------------------------------------------------------------

# Accessibility (WCAG 2.2 AA)

-   [ ] Keyboard navigation works
-   [ ] Visible focus states
-   [ ] Sufficient color contrast
-   [ ] Semantic HTML
-   [ ] ARIA attributes where required
-   [ ] Touch targets ≥ 44×44 px
-   [ ] Screen reader compatibility

------------------------------------------------------------------------

# UI States

Every interactive screen includes:

-   [ ] Default
-   [ ] Hover
-   [ ] Focus
-   [ ] Active
-   [ ] Loading
-   [ ] Empty
-   [ ] Success
-   [ ] Error
-   [ ] Disabled

------------------------------------------------------------------------

# Performance

-   [ ] Optimized images
-   [ ] Lazy loading where appropriate
-   [ ] No unnecessary animations
-   [ ] Minimal layout shift

------------------------------------------------------------------------

# Microinteractions

-   [ ] Hover feedback
-   [ ] Focus feedback
-   [ ] Loading indicators
-   [ ] Success feedback
-   [ ] Error feedback
-   [ ] Reduced-motion respected

------------------------------------------------------------------------

# Documentation

-   [ ] Component documented
-   [ ] Props documented
-   [ ] Design tokens updated
-   [ ] Screenshots reviewed (if applicable)

------------------------------------------------------------------------

# Final Approval

Before merge:

-   [ ] Product approval
-   [ ] Design approval
-   [ ] Accessibility review
-   [ ] Responsive review
-   [ ] QA completed

------------------------------------------------------------------------

# Goal

Ensure every UI delivered in STRATON meets the project's standards for
quality, accessibility, consistency, and maintainability.
