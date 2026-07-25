# STRATON --- DOCUMENTATION STANDARD

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the official documentation standards for the
STRATON project.

Good documentation is considered part of the product and must evolve
together with the codebase.

------------------------------------------------------------------------

# Documentation Principles

-   Documentation must be accurate.
-   Documentation must be concise.
-   Documentation must be updated whenever the system changes.
-   Documentation is the project's source of truth.

------------------------------------------------------------------------

# Directory Structure

The `docs/` directory is organized into numbered domains:

-   00-governance, 01-product, 02-architecture, 03-design, 04-development, 05-sprints, 06-roadmap, 07-vision, plus `assets/`.

Each document belongs to one domain only, and each subject has exactly one canonical file — link to it instead of duplicating its content elsewhere.

------------------------------------------------------------------------

# Document template

Every document should include: Title, Version, Status, Last Updated, Purpose, Main Content, and References (when applicable). Status must be one of: Completed, In Progress, Planned, Experimental, Deprecated — and must reflect what is actually built, not what is intended. Never state that a feature exists if it has not been implemented.

------------------------------------------------------------------------

# Required Sprint updates

Every Sprint evaluates and updates, as applicable: the roadmap and current/next Sprint state, the Sprint document and acceptance results, architecture documentation for structural decisions, relevant README indexes, and feature documentation for behavior, permissions, states, and limitations. No Sprint is complete until its required documentation is current.

------------------------------------------------------------------------

# Status integrity

Mark work "Completed" only after acceptance checks pass. Use "Completed with observations" when usable work has documented limitations, and "Blocked" only when completion is impossible without external input or a state change.

------------------------------------------------------------------------

# Writing Style

Use:

-   Clear language
-   Short sections
-   Consistent terminology
-   Markdown headings
-   Bullet lists where appropriate

Avoid:

-   Ambiguous wording
-   Personal opinions
-   Outdated instructions
-   Duplicated information

------------------------------------------------------------------------

# Versioning

Update the document version when significant changes occur.

Suggested format:

-   1.0 -- Initial release
-   1.1 -- Minor updates
-   2.0 -- Major restructuring

------------------------------------------------------------------------

# Maintenance

Whenever architecture, workflow or standards change:

-   Review affected documents.
-   Remove obsolete information.
-   Keep references synchronized.

------------------------------------------------------------------------

# Cross References

When relevant, reference related documents instead of duplicating
content.

Examples:

-   AI_CONTEXT.md
-   PROJECT_STRUCTURE.md
-   PROJECT_DECISIONS.md
-   DEVELOPMENT_RULES.md

------------------------------------------------------------------------

# Review Checklist

Before publishing documentation:

-   Grammar reviewed
-   Technical accuracy verified
-   Links and references updated
-   Formatting consistent

------------------------------------------------------------------------

# Goal

Maintain a professional, organized and reliable documentation system
that supports long-term development of STRATON.
