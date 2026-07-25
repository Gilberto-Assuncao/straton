# STRATON --- API GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official API standards for STRATON. It ensures
consistency, security, and maintainability across all backend endpoints
and integrations.

------------------------------------------------------------------------

# API Strategy

Preferred communication:

1.  Server Actions (internal application flows)
2.  Route Handlers (external integrations and public APIs)

Avoid exposing unnecessary endpoints.

------------------------------------------------------------------------

# Endpoint Design

Guidelines:

-   Use REST principles where applicable.
-   Keep URLs resource-oriented.
-   Use plural resource names.

Examples:

-   GET /api/projects
-   POST /api/projects
-   PATCH /api/projects/:id
-   DELETE /api/projects/:id

------------------------------------------------------------------------

# HTTP Methods

-   GET → Retrieve data
-   POST → Create resources
-   PATCH → Partial updates
-   PUT → Full replacement (rare)
-   DELETE → Remove resources

------------------------------------------------------------------------

# Request Validation

Every request must validate:

-   Authentication
-   Authorization
-   Input schema
-   Business rules

Reject invalid requests early.

------------------------------------------------------------------------

# Response Format

Successful response:

``` json
{
  "success": true,
  "data": {}
}
```

Error response:

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input."
  }
}
```

------------------------------------------------------------------------

# HTTP Status Codes

-   200 OK
-   201 Created
-   204 No Content
-   400 Bad Request
-   401 Unauthorized
-   403 Forbidden
-   404 Not Found
-   409 Conflict
-   422 Unprocessable Entity
-   500 Internal Server Error

Use the most specific code available.

------------------------------------------------------------------------

# Pagination

Support:

-   page
-   pageSize

Return metadata:

-   totalItems
-   totalPages
-   currentPage

------------------------------------------------------------------------

# Filtering & Sorting

Filtering:

-   Query parameters

Sorting:

-   sortBy
-   sortOrder

Avoid complex query syntax.

------------------------------------------------------------------------

# Authentication

Protected endpoints require:

-   Valid Supabase session
-   Server-side verification
-   Tenant validation

Never trust client claims.

------------------------------------------------------------------------

# Security

-   Validate all input
-   Rate-limit public endpoints
-   Sanitize output when necessary
-   Avoid exposing internal errors

------------------------------------------------------------------------

# Versioning

Current strategy:

-   Internal APIs: no version prefix
-   Public APIs: /api/v1/

Breaking changes require a new API version.

------------------------------------------------------------------------

# Documentation

Every public endpoint should document:

-   Purpose
-   Parameters
-   Request examples
-   Response examples
-   Error codes
-   Authentication requirements

------------------------------------------------------------------------

# Goal

Provide a predictable, secure and scalable API layer for the STRATON
platform.
