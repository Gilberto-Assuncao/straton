# STRATON --- DOMAIN MODEL

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the core business domain model of the STRATON
platform.

It describes the primary entities, their relationships, business rules
and ubiquitous language used across the product.

------------------------------------------------------------------------

# Domain Principles

-   Business rules are independent from the user interface.
-   Every entity has a clear responsibility.
-   Relationships are explicit.
-   Business terminology remains consistent throughout the platform.

------------------------------------------------------------------------

# Core Entities

## Tenant

Represents a customer organization using STRATON.

Owns:

-   Companies
-   Users
-   Projects
-   Teams
-   Workforce
-   Settings

------------------------------------------------------------------------

## Company

Represents a legal entity within a tenant.

Responsibilities:

-   Company profile
-   Departments
-   Operational configuration

------------------------------------------------------------------------

## Team

Represents a group of employees working together.

Relationships:

-   Belongs to one Company
-   Has many Employees
-   Participates in Projects

------------------------------------------------------------------------

## Employee

Represents a worker registered in the platform.

Responsibilities:

-   Personal information
-   Employment details
-   Team membership
-   Time registration

------------------------------------------------------------------------

## Project

Represents a customer project or internal activity.

Relationships:

-   Belongs to a Company
-   Has assigned Teams
-   Receives Time Entries

------------------------------------------------------------------------

## Time Entry

Represents a recorded period of work.

Attributes:

-   Date
-   Start time
-   End time
-   Duration
-   Employee
-   Project

Business Rules:

-   Cannot overlap with another entry for the same employee.
-   Duration must be positive.
-   Must belong to the active tenant.

------------------------------------------------------------------------

## Timesheet

Aggregates multiple time entries.

Responsibilities:

-   Weekly summaries
-   Approval workflow
-   Reporting

------------------------------------------------------------------------

## User

Represents an authenticated platform user.

Responsibilities:

-   Authentication
-   Authorization
-   Role assignment

------------------------------------------------------------------------

# Aggregates

Recommended aggregates:

-   Company
-   Workforce
-   Project
-   Timesheet

Each aggregate maintains its own business consistency.

------------------------------------------------------------------------

# Value Objects

Examples:

-   Email
-   Address
-   Money
-   TimeRange
-   Duration

Value objects should be immutable whenever possible.

------------------------------------------------------------------------

# Ubiquitous Language

Standard terminology:

-   Tenant
-   Company
-   Team
-   Employee
-   Project
-   Time Entry
-   Timesheet
-   Supervisor
-   Manager

These terms should remain consistent across documentation and code.

------------------------------------------------------------------------

# Goal

Provide a shared business model that aligns product, architecture and
implementation while ensuring a common language across the STRATON
platform.
