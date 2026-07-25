# STRATON --- AI DEVELOPMENT GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines how Artificial Intelligence assistants participate in
the development workflow of STRATON, ensuring consistent, secure, and
high-quality contributions.

------------------------------------------------------------------------

# Objectives

-   Accelerate development
-   Improve documentation
-   Reduce repetitive work
-   Maintain coding standards
-   Preserve architectural consistency

------------------------------------------------------------------------

# Supported AI Assistants

Current approved assistants:

-   Claude Code
-   ChatGPT
-   OpenAI Codex

Future assistants may be added after evaluation.

------------------------------------------------------------------------

# Responsibilities

## AI

-   Generate code
-   Explain architecture
-   Suggest improvements
-   Produce documentation
-   Generate tests
-   Assist debugging

## Human Developer

-   Review every change
-   Validate business rules
-   Approve merges
-   Protect secrets
-   Make final architectural decisions

AI never replaces human approval.

------------------------------------------------------------------------

# Development Workflow

1.  Read documentation.
2.  Understand the task.
3.  Generate the smallest possible change.
4.  Preserve existing architecture.
5.  Update documentation when necessary.
6.  Run tests.
7.  Submit for human review.

------------------------------------------------------------------------

# Coding Rules

AI must:

-   Follow TypeScript strict mode
-   Reuse existing components
-   Respect Design Tokens
-   Follow project architecture
-   Avoid duplicated code
-   Keep functions focused

------------------------------------------------------------------------

# Documentation

Every architectural or behavioral change should update the corresponding
documentation before merge.

Documentation is part of the deliverable.

------------------------------------------------------------------------

# Security

AI must never:

-   Expose secrets
-   Hardcode credentials
-   Bypass authentication
-   Disable validation
-   Ignore RLS policies

------------------------------------------------------------------------

# Prompt Guidelines

Good prompts should include:

-   Objective
-   Scope
-   Files allowed to change
-   Constraints
-   Expected result

------------------------------------------------------------------------

# Review Checklist

Before accepting AI-generated code:

-   Documentation updated
-   Tests passing
-   TypeScript clean
-   Lint clean
-   No duplicated code
-   Security verified
-   Accessibility preserved

------------------------------------------------------------------------

# Goal

Enable safe, efficient collaboration between developers and AI
assistants while preserving the quality, maintainability, and long-term
vision of the STRATON platform.
