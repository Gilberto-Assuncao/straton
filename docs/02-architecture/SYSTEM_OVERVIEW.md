# STRATON --- SYSTEM OVERVIEW

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document provides a high-level overview of the STRATON platform
architecture.

It serves as the entry point for understanding how the system is
organized before reading detailed architecture documents.

------------------------------------------------------------------------

# Product Vision

STRATON is a multi-tenant SaaS platform for workforce, time tracking and
project management.

The platform supports:

-   Personal Mode
-   Company Mode

Both modes share the same core architecture.

------------------------------------------------------------------------

# Technology Stack

## Frontend

-   Next.js 16
-   React
-   TypeScript
-   Tailwind CSS

## Backend

-   Supabase
-   PostgreSQL
-   Server Components
-   Route Handlers

------------------------------------------------------------------------

# Core Modules

-   Authentication
-   Dashboard
-   Companies
-   Teams
-   Workforce
-   Projects
-   Time Tracking
-   Timesheets
-   Reports
-   Settings

------------------------------------------------------------------------

# Architectural Layers

-   Presentation
-   Features
-   Application
-   Domain
-   Infrastructure

Each layer has a single responsibility.

------------------------------------------------------------------------

# Guiding Principles

-   Simplicity
-   Scalability
-   Predictability
-   Performance
-   Maintainability

------------------------------------------------------------------------

# Documentation References

See also:

-   PROJECT_STRUCTURE.md
-   ARCHITECTURE_PRINCIPLES.md
-   PROJECT_DECISIONS.md

------------------------------------------------------------------------

# Goal

Provide a shared architectural understanding for developers and AI
assistants before implementation begins.
