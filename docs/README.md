# STRATON Documentation

Version: 2.0 Status: Active Last Updated: 2026-07-21

This directory is the canonical technical and product context for STRATON — for developers and for any AI assistant (Claude Code, Codex, Cursor, ChatGPT, GitHub Copilot) working on the project. Implemented capabilities are distinguished from planned modules throughout: every document states a Status of **Completed**, **In Progress**, **Planned**, **Experimental**, or **Deprecated**, and none claims a capability exists before it is actually implemented.

Each subject has exactly one canonical file. If you find two documents about the same topic, that is a bug — consolidate them rather than adding a third.

------------------------------------------------------------------------

## 00-governance/ — how the project is managed

Start here. [00-governance/README.md](00-governance/README.md) indexes the rules every contributor (human or AI) follows: [AI_CONTEXT.md](00-governance/AI_CONTEXT.md) and [PROJECT_STRUCTURE.md](00-governance/PROJECT_STRUCTURE.md) are the fastest way to get oriented in the real codebase, [CLAUDE_GUIDE.md](00-governance/CLAUDE_GUIDE.md)/[CHATGPT_GUIDE.md](00-governance/CHATGPT_GUIDE.md) are tool-specific, and [DEVELOPMENT_HANDBOOK.md](00-governance/DEVELOPMENT_HANDBOOK.md) plus the `*_POLICY.md` files carry the binding coding/testing/security/release/documentation rules.

## 01-product/ — what is built and why

[01-product/PRODUCT_README.md](01-product/PRODUCT_README.md) indexes vision, personas, PRD, business rules, and roadmap-adjacent product documents. Read [PRODUCT_VISION.md](01-product/PRODUCT_VISION.md), [USER_PERSONAS.md](01-product/USER_PERSONAS.md), [PRODUCT_REQUIREMENTS_DOCUMENT.md](01-product/PRODUCT_REQUIREMENTS_DOCUMENT.md), [BUSINESS_RULES.md](01-product/BUSINESS_RULES.md), and [PRICING_STRATEGY.md](01-product/PRICING_STRATEGY.md) first — these were rewritten from the detailed product work in `../Documentacao Projeto STRATON/STRATON_MASTER_DOCUMENTATION_7.md` (chapters 1–7) rather than left as generic placeholders. The remaining files in this folder (DOMAIN_MODEL, COMPETITIVE_ANALYSIS, MVP_SCOPE, RISK_REGISTER, SUCCESS_METRICS, PRODUCT_GLOSSARY, PRODUCT_DECISIONS_LOG, PRODUCT_CHANGE_REQUESTS, RELEASE_STRATEGY, GO_TO_MARKET_STRATEGY, FUNCTIONAL_REQUIREMENTS, NON_FUNCTIONAL_REQUIREMENTS, USER_STORIES) still need the same treatment — see the consolidation report for this Sprint.

## 02-architecture/ — how the system is built

[ARCHITECTURE_OVERVIEW.md](02-architecture/ARCHITECTURE_OVERVIEW.md) is the entry point. Core, code-grounded documents: [FILE_STRUCTURE.md](02-architecture/FILE_STRUCTURE.md), [DATABASE_ARCHITECTURE.md](02-architecture/DATABASE_ARCHITECTURE.md), [MULTITENANCY.md](02-architecture/MULTITENANCY.md), [AUTHENTICATION.md](02-architecture/AUTHENTICATION.md), [AUTHORIZATION.md](02-architecture/AUTHORIZATION.md), [APP_SHELL.md](02-architecture/APP_SHELL.md), [DOMAIN_ARCHITECTURE.md](02-architecture/DOMAIN_ARCHITECTURE.md), [COMPANY_MANAGEMENT.md](02-architecture/COMPANY_MANAGEMENT.md), [TEAM_MANAGEMENT.md](02-architecture/TEAM_MANAGEMENT.md), [WORKFORCE_MANAGEMENT.md](02-architecture/WORKFORCE_MANAGEMENT.md). Explicitly **Planned** future modules: [WEATHER_INTELLIGENCE.md](02-architecture/WEATHER_INTELLIGENCE.md), [WORKFORCE_PROFITABILITY.md](02-architecture/WORKFORCE_PROFITABILITY.md), [PAYROLL_SOCIAL_RULES.md](02-architecture/PAYROLL_SOCIAL_RULES.md) — no code exists for any of the three yet.

## 03-design/ — how users experience the product

[DESIGN_README.md](03-design/DESIGN_README.md) indexes the design system; start with [DESIGN_SYSTEM.md](03-design/DESIGN_SYSTEM.md), which documents the real `src/components` and `src/design-system` library.

## 04-development/ — implementation guides

[DEVELOPMENT_README.md](04-development/DEVELOPMENT_README.md) indexes frontend/backend/database/API/Supabase/TypeScript/Tailwind/testing/deployment/security guides.

## 05-sprints/ — execution record

[SPRINT_README.md](05-sprints/SPRINT_README.md) indexes Sprint process docs and the actual Sprint history (3.5.2 through 4.3). Sprints 3.5.2–3.9.1 have as-built retrospectives; Sprints 4.0–4.3 currently only have their original specifications (ported from the top-level `Sprint/` folder) — an as-built pass is still owed there.

## 06-roadmap/ — where the product is going

[ROADMAP_README.md](06-roadmap/ROADMAP_README.md) indexes feature, technical, and release roadmaps.

## 07-vision/ — product handbook

[STRATON_HANDBOOK.md](07-vision/STRATON_HANDBOOK.md) — STRATON Solo vs. Business editions, core platform concepts, and the "Time Well Managed" product principle.

## assets/

Reserved for diagrams and images referenced by the documents above. Empty today.

------------------------------------------------------------------------

## Source of truth priority

If two documents conflict: (1) re-check the actual code/database — documentation describes reality, it does not override it; (2) `00-governance/PROJECT_DECISIONS.md`; (3) `00-governance/AI_CONTEXT.md`; (4) the narrowest document actually governing the affected area.

## What changed in this consolidation (2026-07-21)

This tree previously had two parallel drafts: a precise, code-grounded set of files (old `architecture/`, `project/`, `sprints/`, `roadmap/`, `design/`, `vision/` folders) and a newer, broader `00 Governance/`–`08-vision/` taxonomy that mixed genuinely excellent content with generic, occasionally inaccurate boilerplate (an invented "Tenant" layer above "Company", a fictional root-level file structure). Both have now been merged into the single structure above — see the Sprint report for the full list of what was kept, corrected, merged, or removed.
