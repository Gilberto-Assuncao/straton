# STRATON --- SECURITY POLICY

Version: 1.0 Status: Active Last Updated: 2026-07-21

Binding security rules. See [../02-architecture/SECURITY_ARCHITECTURE.md](../02-architecture/SECURITY_ARCHITECTURE.md) and [../04-development/SECURITY_GUIDE.md](../04-development/SECURITY_GUIDE.md) for broader architecture and tooling detail.

STRATON is secure by default. UI visibility is never authorization.

## Authentication and authorization

- Verify identity on trusted server boundaries.
- Keep service-role credentials server-only and never expose secrets through public environment variables.
- Derive current company and membership from trusted session state.
- Roles group permissions; permissions remain data-driven and are enforced at application and database boundaries.
- Recheck authorization inside mutations and server functions; do not rely only on routing or proxy behavior.

## Multi-company isolation

- Every tenant-owned record includes CompanyId where required.
- Every tenant query is scoped and indexed by company.
- Supabase RLS is mandatory for exposed tenant tables and storage objects.
- Cross-company collaboration uses explicit relationships and grants.
- Service-role operations are narrow, audited, and exceptional.

## Data protection

Minimize collected data, restrict sensitive compensation and profitability information, validate uploads, define retention, and avoid secrets or personal data in logs. Encrypt transport, use managed secret storage, and separate demonstration, development, staging, and production environments.

## Logs and audit

Operational logs support diagnosis without leaking credentials or sensitive payloads. Audit records capture actor, company, action, target, time, and appropriate metadata for significant security and business events. Audit trails are append-oriented and access-controlled.

See [Authentication](../02-architecture/AUTHENTICATION.md) and [Multi-tenancy](../02-architecture/MULTITENANCY.md).
