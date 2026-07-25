# STRATON --- DEVELOPMENT HANDBOOK

Version: 1.0 Status: Active Last Updated: 2026-07-21

## Product and purpose

STRATON is a time and workforce platform guided by **TIME WELL MANAGED.** It supports independent professionals and organizations that coordinate hours, timesheets, projects, sites, teams, documents, reporting, and trusted multi-company collaboration. The long-term vision includes STRATON Solo, STRATON Business, STRATON Connect, Contractor Network, finance, accounting, marketplace, internationalization, operational intelligence, and responsible AI.

The platform must provide clarity without sacrificing privacy, tenant isolation, accessibility, or user control. Planned modules are not treated as implemented until code, validation, documentation, and review confirm delivery.

## Project principles

1. Preserve a global professional identity independent from company membership.
2. Enforce company boundaries in data access and authorization.
3. Keep domain rules independent from frameworks and presentation.
4. Reuse the official design system and application shell.
5. Prefer small, typed, composable modules over broad abstractions.
6. Build mobile-first, accessible, secure-by-default interfaces.
7. Separate confirmed records from forecasts, estimates, and demonstration data.
8. Document decisions and validate behavior before delivery.

## Developing a feature

1. Read `AGENTS.md`, this handbook, the roadmap, relevant sprint, architecture, domain, security, and design documentation.
2. Verify repository root, branch, working tree, dependencies, and existing implementation.
3. Identify reusable components, domain contracts, repositories, services, migrations, and tests before creating files.
4. Define objective, exclusions, user value, data ownership, permissions, acceptance criteria, and validation plan.
5. Design the smallest change consistent with existing architecture.
6. Implement domain and application behavior before infrastructure and UI when business rules exist.
7. Keep client boundaries narrow and never place authorization only in presentation code.
8. Update the feature, architecture, sprint, roadmap, and indexes as required.
9. Run the validation matrix and review the complete diff.
10. Deliver a factual report; commit or push only after explicit authorization.

## Sprint organization

Every Sprint document records status, objective, background, scope, exclusions, affected architecture, planned files, security considerations, accessibility, acceptance criteria, validation commands, documentation impact, and delivery policy. A Sprint begins only after the current working tree is understood. It ends only when required checks pass or its status accurately records observations or blockers.

## Review flow

Review the result in this order: scope fidelity, preservation of existing behavior, security and tenant isolation, domain correctness, types and error handling, accessibility and responsiveness, performance, tests, documentation, and diff hygiene. Review comments must identify impact and evidence rather than personal preference.

## Documentation flow

Update documentation alongside implementation. Use present tense only for verified behavior, mark conceptual modules as planned, link canonical sources instead of copying them, and keep indexes navigable. Important architectural decisions belong in architecture documentation, not only commit messages or chat transcripts.

## Testing flow

Run lint, dedicated typecheck when available, tests, production build, diff checks, and proportionate manual validation. Interactive or visual work requires keyboard, mobile, overflow, focus, and console checks. Database work requires migration, RLS, tenant-isolation, and rollback review in an appropriate environment.

## Delivery flow

Confirm the exact changed files, ensure no unrelated work is included, record check results, and state unresolved limitations. Commit, push, pull request, release, migrations, and production changes require explicit authority and follow the dedicated workflow documents.

## How Codex must work

- Analyze the project and relevant instructions before editing.
- Preserve all pre-existing and uncommitted work.
- Never recreate an equivalent component or replace established architecture without evidence and authorization.
- Reuse existing domain contracts, services, design-system components, layouts, and utilities.
- Keep changes strictly within scope and document material decisions.
- Run lint and production build; run typecheck and tests when available.
- Never hide errors with `any`, broad suppressions, or disabled rules.
- Never commit or push unless the user explicitly requests it for the current task.
- Always provide a final report with files, validation results, limitations, and delivery state.

## How developers must work

Developers own the same diligence as automation: read context, inspect before changing, protect user work, use small reviewable diffs, validate locally, document decisions, and never bypass security or quality gates to meet a deadline. Uncertainty must be surfaced early with concrete evidence.

## Standards for other AI tools

ChatGPT, Claude, Cursor, GitHub Copilot, and any other AI assistant must follow the official STRATON documentation, repository instructions, explicit task scope, and human authorization boundaries. Generated output is a proposal until inspected and validated. No AI may invent completed capabilities, production data, credentials, legal rules, payroll results, or security guarantees.
