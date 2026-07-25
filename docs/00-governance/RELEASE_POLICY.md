# STRATON --- RELEASE POLICY

Version: 1.0 Status: Active Last Updated: 2026-07-21

See [../02-architecture/DEPLOYMENT_ARCHITECTURE.md](../02-architecture/DEPLOYMENT_ARCHITECTURE.md) and [../04-development/DEPLOYMENT_GUIDE.md](../04-development/DEPLOYMENT_GUIDE.md) for deployment mechanics.

## Commit readiness

A commit is appropriate only when scope is coherent, required validation passes, documentation is updated, secrets are absent, and the user or established workflow explicitly authorizes it. Use Conventional Commits and stage only intended files.

## Push and review

Push only after explicit authorization, to the intended remote and branch. Use a pull request when review, CI, migrations, risk visibility, or team policy requires it. The pull request records objective, changes, screenshots when useful, test evidence, migration impact, security considerations, and rollback plan.

## Versioning

Use semantic versioning for product releases:

- patch: compatible fixes and internal improvements;
- minor: backward-compatible capabilities;
- major: intentional breaking changes or migration requirements.

Sprint numbers are planning identifiers, not product versions.

## Release and changelog

Create a release only after the target commit is reviewed, CI is green, deployment configuration is ready, migrations are ordered, and rollback is understood. Maintain a changelog for user-visible changes, security fixes, breaking changes, migration steps, and deprecations. Internal refactors without user impact need accurate engineering history but not inflated release notes.

Post-release verification checks availability, authentication, tenant isolation, key workflows, observability, and migration health.
