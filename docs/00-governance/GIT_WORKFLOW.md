# STRATON --- GIT WORKFLOW

Version: 1.1 Status: Active Last Updated: 2026-07-21

# Purpose

Define the official Git workflow for the STRATON project — both the branch/release policy and the concrete per-Sprint sequence every contributor (human or AI) follows.

------------------------------------------------------------------------

# Branch strategy

`main` is production-ready, always stable, and today the only branch in the repository. Future branches (`develop`, `feature/*`, `hotfix/*`, `release/*`) are introduced only when project complexity actually requires them — do not create them preemptively.

------------------------------------------------------------------------

# Starting a Sprint

1. Confirm the repository root and read the repository instructions (`00 Governance/AI_CONTEXT.md`, the current Sprint spec).
2. Run `git status`, `git branch --show-current`, and inspect recent history.
3. Synchronize only when authorized and the working tree is safe.
4. Preserve all existing changes — never `reset`, `clean`, `restore`, or `stash` without explicit direction. If unfamiliar uncommitted state is found, investigate before touching it; it may be in-progress work from another tool or session.

------------------------------------------------------------------------

# Implementation and validation

Keep the diff scoped and review it continuously. Before delivery, run whichever of these actually exist in the project:

```text
npm run lint
npx tsc --noEmit
npm test
npm run build
git diff
git status
```

Run only scripts that exist. Record a missing script rather than inventing a passing result.

------------------------------------------------------------------------

# Commit policy

Never commit or push automatically — a Sprint specification may explicitly authorize it; otherwise stop after validation and report the working tree state. When authorized: stage only the scoped files, use Conventional Commits (`feat(auth): add session validation`, `fix(timesheet): correct timezone conversion`, `docs(governance): update coding principles` — never vague messages like "update" or "fixes"), verify the commit, then push only the intended branch.

------------------------------------------------------------------------

# Pull requests

When the workflow uses pull requests: create a focused branch, state objective and validation evidence, identify migrations and risks, keep unrelated work out, and resolve review threads only once the underlying issue is actually handled. Every PR records objective, files changed, risks, and validation results.

------------------------------------------------------------------------

# Forbidden actions

Never: force-push to `main`, rewrite published history, commit generated secrets or `.env` files, or skip hooks/verification flags without explicit user request.

------------------------------------------------------------------------

# Versioning

Semantic Versioning for product releases (`v1.0.0`, `v1.1.0`, `v1.1.1`) — see [../06-roadmap/](../06-roadmap/) for release sequencing. Sprint numbers are planning identifiers, not product versions.

------------------------------------------------------------------------

# Documentation

Significant changes must update the roadmap/current Sprint state, `PROJECT_DECISIONS.md`, and any affected governance/architecture documents.

------------------------------------------------------------------------

# Goal

Maintain a clean, traceable, and predictable Git history, with every Sprint following the same safe, verifiable sequence.
