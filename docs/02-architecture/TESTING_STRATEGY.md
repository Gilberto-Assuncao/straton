# STRATON --- TESTING STRATEGY

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official testing strategy for the STRATON
platform.

The goal is to ensure software quality, reduce regressions, and enable
safe, continuous delivery.

------------------------------------------------------------------------

# Testing Principles

-   Test critical business logic first.
-   Prefer automated tests over manual verification.
-   Keep tests deterministic and independent.
-   Write tests that are easy to understand and maintain.
-   Fix failing tests before merging new code.

------------------------------------------------------------------------

# Testing Pyramid

The project follows the classic testing pyramid:

1.  Unit Tests (largest layer)
2.  Integration Tests
3.  End-to-End (E2E) Tests (smallest layer)

This balance maximizes confidence while minimizing execution time.

------------------------------------------------------------------------

# Unit Tests

Purpose:

-   Validate individual functions and components.
-   Execute quickly.
-   Avoid external dependencies.

Examples:

-   Utility functions
-   Validators
-   Formatters
-   Business rules
-   Custom hooks

------------------------------------------------------------------------

# Integration Tests

Purpose:

-   Validate interactions between modules.

Examples:

-   API + Database
-   Server Actions
-   Authentication flow
-   Authorization rules
-   Repository layer

------------------------------------------------------------------------

# End-to-End (E2E) Tests

Purpose:

Validate complete user workflows.

Priority scenarios:

-   Login
-   Logout
-   Company creation
-   Team management
-   Workforce management
-   Time registration
-   Report generation

------------------------------------------------------------------------

# Test Organization

Recommended structure:

``` text
tests/
├── unit/
├── integration/
├── e2e/
├── fixtures/
└── mocks/
```

------------------------------------------------------------------------

# Coverage Guidelines

Prioritize coverage for:

-   Authentication
-   Authorization
-   Billing
-   Time tracking
-   Business rules

Coverage percentage should never become more important than test
quality.

------------------------------------------------------------------------

# Mocking

Use mocks only for:

-   External APIs
-   Third-party services
-   Time-dependent logic
-   Email providers

Avoid mocking internal business logic whenever possible.

------------------------------------------------------------------------

# Continuous Integration

Every Pull Request should:

-   Run linting
-   Run type checking
-   Execute automated tests
-   Fail on test errors

No code should be merged with failing tests.

------------------------------------------------------------------------

# Manual Testing

Before releasing:

-   Verify core user journeys.
-   Validate responsive layouts.
-   Confirm accessibility basics.
-   Check localization where applicable.

------------------------------------------------------------------------

# Goal

Provide a reliable testing strategy that supports continuous development
while maintaining high quality across the STRATON platform.
