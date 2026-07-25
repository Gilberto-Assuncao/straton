# STRATON --- ROADMAP PLANNING POLICY

Version: 1.0 Status: Active Last Updated: 2026-07-21

See [../06-roadmap/ROADMAP_README.md](../06-roadmap/ROADMAP_README.md) for the actual roadmap content this policy governs.

Large capabilities do not begin with code. They begin with a reviewed problem definition and architecture.

## Required planning package

Before implementation, document:

- user and business problem;
- target users and editions;
- objective, non-goals, and measurable outcome;
- domain concepts and ownership;
- tenant, role, permission, privacy, and audit requirements;
- data model, lifecycle, retention, and migration impact;
- integrations and failure modes;
- UX states, accessibility, mobile behavior, and design-system reuse;
- API or repository boundaries;
- phased delivery and dependencies;
- acceptance criteria, validation plan, rollout, and rollback.

## Sequencing

Prefer vertical, reviewable increments that produce a coherent capability. Foundations must be proven by one bounded use case before expanding across many modules. Avoid parallel implementation of finance, payroll, weather, AI, marketplace, and networking without shared contracts and explicit prioritization.

## Claims and status

Roadmaps describe intent, not guarantees. Label concepts as planned, researched, experimental, in progress, completed, or deprecated. Completion requires merged code, validation, documentation, and any required deployment or migration—not only mock UI or domain types.

## High-risk modules

Payroll, social rules, finance, profitability, weather evidence, identity verification, and AI decisions require source traceability, jurisdiction and effective-date modeling, privacy review, permission design, auditability, and clear separation between estimates and official confirmed values.
