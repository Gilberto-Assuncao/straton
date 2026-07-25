# STRATON --- Governance

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Overview

The `00-governance` directory contains the official governance documents
for the STRATON project.

These documents define how the project is planned, developed, reviewed
and maintained. They are the primary reference for both human
contributors and AI assistants.

------------------------------------------------------------------------

# Documents

  Document                     Purpose
  ---------------------------- ----------------------------------------------------
  AI_CONTEXT.md                Permanent project context for AI assistants.
  CLAUDE_GUIDE.md              Rules and responsibilities for Claude Code.
  CHATGPT_GUIDE.md             Rules and responsibilities for ChatGPT.
  DEVELOPMENT_RULES.md         Global development standards.
  PROJECT_STRUCTURE.md         Official project folder organization.
  PROJECT_DECISIONS.md         Architecture Decision Records (ADRs).
  SPRINT_TEMPLATE.md           Standard Sprint execution workflow.
  CODING_PRINCIPLES.md         Coding conventions and quality principles.
  ARCHITECTURE_PRINCIPLES.md   Core architectural guidelines.
  GIT_WORKFLOW.md              Git branching, commits and release workflow.
  DEFINITION_OF_DONE.md        Completion criteria for tasks and Sprints.
  REVIEW_CHECKLIST.md          Technical review checklist.
  DOCUMENTATION_STANDARD.md    Documentation writing standards.
  CHANGELOG_POLICY.md          Rules for maintaining the changelog.
  VERSIONING.md                Versioning strategy for product and documentation.
  DEVELOPMENT_HANDBOOK.md      Full development workflow: how to plan, build, review and deliver a Sprint.
  DESIGN_PRINCIPLES_POLICY.md  Binding design rules (see 03-design for the full design system).
  TESTING_POLICY.md            Binding validation rules for every Sprint.
  RELEASE_POLICY.md            Commit, push, PR and release readiness rules.
  SECURITY_POLICY.md           Binding security and tenant-isolation rules.
  ROADMAP_PLANNING_POLICY.md   How large capabilities must be planned before implementation.

------------------------------------------------------------------------

# Governance Principles

-   Documentation is part of the product.
-   Architecture evolves through documented decisions.
-   Small, well-defined Sprints are preferred.
-   Quality takes priority over speed.
-   AI assistants must follow the governance documents before
    implementing changes.

------------------------------------------------------------------------

# Source of Truth

If two documents conflict, use the following priority:

1.  PROJECT_DECISIONS.md
2.  AI_CONTEXT.md
3.  DEVELOPMENT_RULES.md
4.  Remaining governance documents

------------------------------------------------------------------------

# Goal

Provide a consistent, maintainable and scalable governance model for the
long-term evolution of STRATON.
