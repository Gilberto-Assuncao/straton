# STRATON --- TESTING GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines the official testing strategy for STRATON to ensure
quality, reliability, and confidence when delivering new features.

------------------------------------------------------------------------

# Testing Pyramid

1.  Unit Tests
2.  Integration Tests
3.  End-to-End (E2E) Tests

Prioritize fast, isolated tests while maintaining critical end-to-end
coverage.

------------------------------------------------------------------------

# Recommended Tools

-   Vitest
-   React Testing Library
-   Playwright
-   Mock Service Worker (MSW)

------------------------------------------------------------------------

# Unit Tests

Focus on:

-   Utility functions
-   Business rules
-   Hooks
-   Validation logic
-   Pure components

Unit tests should be deterministic and independent.

------------------------------------------------------------------------

# Integration Tests

Validate interactions between:

-   Components
-   Server Actions
-   Repositories
-   Database abstractions
-   Authentication flows

Mock external services whenever practical.

------------------------------------------------------------------------

# End-to-End Tests

Critical user journeys include:

-   Login & Logout
-   Registration
-   Password reset
-   Company management
-   Team management
-   Project management
-   Timesheet submission
-   Dashboard navigation

------------------------------------------------------------------------

# Component Testing

Verify:

-   Rendering
-   User interactions
-   Accessibility
-   State transitions
-   Error handling

------------------------------------------------------------------------

# Server Actions

Test:

-   Input validation
-   Authorization
-   Business logic
-   Expected responses
-   Error conditions

------------------------------------------------------------------------

# Authentication & Authorization

Verify:

-   Protected routes
-   Session expiration
-   Role-based permissions
-   Tenant isolation
-   Row Level Security behavior

------------------------------------------------------------------------

# Performance Testing

Monitor:

-   Large datasets
-   Slow queries
-   Rendering performance
-   Bundle size

------------------------------------------------------------------------

# Coverage Goals

Recommended minimums:

-   Statements: 80%
-   Branches: 80%
-   Functions: 80%
-   Lines: 80%

Critical business logic should exceed these targets.

------------------------------------------------------------------------

# Pull Request Checklist

-   New code tested
-   Existing tests pass
-   No flaky tests
-   Coverage maintained
-   Critical flows verified

------------------------------------------------------------------------

# Goal

Deliver a reliable, maintainable platform by applying consistent
automated testing throughout the STRATON development lifecycle.
