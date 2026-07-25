# STRATON --- PRODUCT VISION

Version: 1.1 Status: Active Last Updated: 2026-07-21

# Purpose

This document defines the vision that every architectural and UX trade-off should be measured against. It supersedes the earlier generic draft of this file with the fuller vision work already produced in `Documentacao Projeto STRATON/STRATON_MASTER_DOCUMENTATION_7.md` (chapters 1–2), translated and condensed here as the canonical English source.

------------------------------------------------------------------------

# What STRATON is

STRATON is a **multi-tenant B2B SaaS platform** for **time, team, and project management**, aimed at mid-sized professional-services companies that need to control working hours, workforce allocation, and per-project/client productivity, with consolidated billing per company (tenant). In one sentence: STRATON answers *"how much time did each person or team spend on each project, is that allocation within budget and contract, and how do we turn that into reliable reports for internal and external stakeholders?"*

Five entities run through every functional module (see [DOMAIN_MODEL.md](DOMAIN_MODEL.md)): **Company** (tenant), **Team**, **Workforce Member**, **Project**, and **Time Entry**.

------------------------------------------------------------------------

# Vision statement

> **STRATON exists so that no professional-services company has to choose between controlling its team's time and trusting its team.**

The product deliberately rejects two common extremes in the time-tracking market:

1. **Excessive surveillance** — tools that screenshot the employee's screen, count clicks per minute, or penalize breaks, treating the worker as a suspect by default.
2. **Unstructured self-reporting** — loose spreadsheets or generic forms where logged time connects to no project, budget, or approval rule, and therefore builds trust with neither the manager nor the end client.

STRATON sits in the middle: **data structured enough to generate trust and correct billing, without surveilling individual behavior.**

------------------------------------------------------------------------

# Vision pillars

1. **Trust without surveillance.** STRATON will never implement passive behavior-monitoring (screen capture, keystroke counting, mouse tracking). Trust in the data comes from the structure of the entry (tied to a Project, subject to manager approval), not from watching the individual. Reversing this is a product/brand decision, not just a technical one — it requires an executive-level ADR (see `05-sprints/` for how ADRs are recorded), not an engineering-only call.
2. **Time as structural data.** A Time Entry only has business value as part of an unbroken chain: `Time Entry → Project → Company`, optionally `→ Task → Team`. Reports, billing, and any future AI suggestion feature depend on that chain never being broken.
3. **Minimum friction on entry.** The biggest threat to data quality is not user malice — it is the tedium of logging time correctly. Every UX decision is evaluated by: "does this reduce or increase the clicks/decisions needed to log a correct time entry?"
4. **Billing as a natural consequence.** Billing is not a separate system that "imports" Time Tracking data after the fact — it is a **projection** of the same approved Time Entry data, never a re-entry of information.

------------------------------------------------------------------------

# What STRATON explicitly is NOT

| Not... | Why it matters |
| --- | --- |
| A full project-management suite (Jira/Asana-class) | STRATON **integrates** with these tools (Planned — see [../06-roadmap/](../06-roadmap/)); it does not compete on backlogs, sprints, or complex task boards. |
| A payroll system | STRATON informs the time data that **feeds** external payroll; it does not calculate taxes, benefits, or issue payslips. |
| An individual productivity-monitoring tool | See pillar 1 — a brand decision, not only a scope decision. |
| A full external-client CRM | A Project's client is a billing-context attribute, not a relationship-management module. |

------------------------------------------------------------------------

# Who STRATON is for

See [USER_PERSONAS.md](USER_PERSONAS.md) for the full detail. In short: the **Owner** (needs to know if a project is profitable before month-end close), the **Team Lead/Manager** (needs fast approvals and real-time capacity visibility), the **Workforce Member** (needs to log time in the fewest possible clicks, with zero surveillance), and **Finance/Billing** (needs the hours report and the invoice amount to never diverge). The vision only holds if it is true for all four **simultaneously** — a feature that helps Finance but adds friction for the Workforce Member violates the vision even if technically correct.

------------------------------------------------------------------------

# Brand statement

**STRATON --- Time Well Managed.**

------------------------------------------------------------------------

# Common mistakes when applying this vision

- Treating STRATON as a generic "electronic timeclock app" — Time Tracking is the atomic data unit, not the whole product.
- Adding "optional" monitoring fields at a large client's request — this breaks pillar 1 even when the intent seems harmless; any such request must go to an executive decision, never be implemented quietly by engineering.
- Assuming "minimum friction" means "fewer required fields always" — it means fewer unnecessary clicks/decisions; a well-designed required field (e.g., a Project selector with search and last-used suggestion) reduces friction more than removing structure entirely.

------------------------------------------------------------------------

# Geographic scope: Belgium-first, multi-country by design

STRATON launches for the Belgian market but must not encode Belgian law or a single segment into the core. Concretely: `companies.registration_number`/`vat_number` stay free-text (no BCE/KBO-specific validation baked into the schema), `localization_settings` models language/timezone/locale/date_format/currency per company or per user rather than assuming one locale, and no business rule anywhere assumes Belgian labor law. See [../02-architecture/DATABASE_ARCHITECTURE.md](../02-architecture/DATABASE_ARCHITECTURE.md) ("Known extensibility gaps") for the concrete audit of what's already ready versus what needs small additions (employee metadata field, hour-type dimension on time entries, missing RLS policies on the localization/certificates tables) before expanding to another country.

------------------------------------------------------------------------

# Goal

Serve as the tie-breaker whenever two technical or UX solutions look equally valid: prefer whichever brings the product closer to this vision.
