# STRATON --- API CONVENTIONS

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official API standards for the STRATON
platform.

All internal and future public APIs must follow these conventions to
ensure consistency, maintainability and scalability.

------------------------------------------------------------------------

# API Principles

-   REST-first design
-   Predictable endpoints
-   Consistent JSON responses
-   Explicit HTTP status codes
-   Server-side validation
-   Secure by default

------------------------------------------------------------------------

# Route Structure

Examples:

GET /api/companies GET /api/companies/{id} POST /api/companies PATCH
/api/companies/{id} DELETE /api/companies/{id}

Resources must use plural nouns.

------------------------------------------------------------------------

# HTTP Methods

-   GET → Read
-   POST → Create
-   PATCH → Partial update
-   PUT → Full replacement (rare)
-   DELETE → Remove

------------------------------------------------------------------------

# Response Format

Successful responses:

``` json
{
  "data": {},
  "meta": {}
}
```

Error responses:

``` json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Company not found."
  }
}
```

Never expose internal implementation details.

------------------------------------------------------------------------

# Status Codes

-   200 OK
-   201 Created
-   204 No Content
-   400 Bad Request
-   401 Unauthorized
-   403 Forbidden
-   404 Not Found
-   409 Conflict
-   422 Validation Error
-   500 Internal Server Error

------------------------------------------------------------------------

# Pagination

Collection endpoints should support:

-   page
-   limit

Responses should include metadata:

-   total
-   page
-   pages
-   limit

------------------------------------------------------------------------

# Filtering & Sorting

Recommended query parameters:

-   filter
-   search
-   sort
-   order

Example:

GET /api/projects?search=office&sort=name&order=asc

------------------------------------------------------------------------

# Authentication

Protected endpoints require:

-   Valid session
-   Authorized tenant
-   Permission verification

Authentication and authorization must always be enforced on the server.

------------------------------------------------------------------------

# Versioning

Future public APIs should use versioned routes.

Example:

/api/v1/ /api/v2/

------------------------------------------------------------------------

# Goal

Provide a consistent, secure and scalable API standard for the long-term
evolution of STRATON.
