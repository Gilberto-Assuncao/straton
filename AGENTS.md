<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working on STRATON

Read by Claude Code (via `CLAUDE.md`) and by Codex. One file, so the two agents
do not pull in opposite directions.

STRATON is workforce management for Belgian field companies: clock-in, sites,
timesheets, payroll periods, compliance. Ten locales. Supabase with row-level
security. The people using it are site managers and workers on a phone in the
rain, not developers.

## The rules that have teeth

Each one exists because it broke something. Each is enforced by a test — if you
are unsure whether a change is allowed, run the test rather than guess.

### A server action returns a key, never a sentence

`tests/unit/message-key-coverage.test.ts`, `tests/unit/locale-parity.test.ts`

Actions return a member of a typed union (`SiteMessageKey`, `AuthMessageKey`,
…); the text is resolved where it is rendered. An action *could* call
`getTranslations` — it runs in the request — and that is still wrong here,
because `t("errNameRequird")` is **not** a compile error. next-intl renders the
raw path and the build stays green. `nav.agenda` was on screen for seventy
minutes that way.

New message → add it to the union *and* to all ten files in `messages/`.

### A provider error never reaches the screen

`tests/unit/raw-error-leaks.test.ts`

`return { message: error.message }` is how `535 5.7.8 Authentication failed`
and a literal `{}` reached a customer. Log the `code` with an `event`, show a
sentence the person can act on. Postgres quotes the offending value back, and
that value is whatever somebody typed.

The budget per file can only shrink. Converting a file to message keys forces
this, because a Postgres string cannot be a key.

### Colours come from tokens

`tests/unit/color-tokens.test.ts`, `tests/unit/contrast.test.ts`

Never write `bg-[#161A34]`. The palette lives in `app/globals.css`; 1826
hardcoded hexadecimals across 159 files is what made changing the theme
impossible, and two of the three colour definitions in the repo rendered
nothing at all.

Borders are still written as `border-white/10`, and that is a known limitation
rather than a pattern to copy: translucent white is an edge on a dark surface
and nothing at all on a light one, so 412 of them are what a theme change would
have to deal with first.

New foreground colour → it is checked against every surface it can land on.
4.5:1 for prose, 3:1 for focus rings. A focus ring below contrast is invisible
in every screenshot and only a keyboard finds it.

### RLS is two layers

`.github/workflows/ci.yml` → `rls-isolation`

Policies and GRANTs are independent; having one is not having the other. RLS
refuses a forbidden write by matching **no rows**, not by raising — so an
action that does not check the returned row count will report a change that
never happened. That silence has been found on four tables here.

`tsc`, `eslint` and the unit suite see none of this. The `rls-isolation` job is
the only real check.

## How to verify

This matters more than any rule above, and it is where both agents fail in the
same way.

**A scan that matches nothing passes forever.** Every guard in this repo
asserts that it found something first — `expect(files.length).toBeGreaterThan(150)`.
A colour comparison here once read from the wrong directory, compared zero
against zero, and reported "identical". Write that assertion before you trust
the result.

**Verify a new test by breaking the thing it guards.** Rename a key, restore a
bad colour, put back the raw error — confirm the test names the file. A test
that has never failed is a test nobody has checked.

**Count, do not read.** 299 insert tuples, 412 borders, 131 changed lines — say
the number and how you got it. "I reviewed the file" is not evidence; a
mechanical count is.

**A large substitution needs exact strings and expected counts.** An
unanchored regex in `employees/actions.ts` once also hit `acceptInviteAction`,
which sets passwords from an invite link. Tables of `(old, new, count)` that
abort on mismatch have caught three counting errors since, before writing
anything.

## Conventions

- Commits and pull request bodies in **Portuguese**. Code, comments and tests in English.
- Never put a model name or identifier in a commit, PR, or code comment.
- Comments say *why*, and name the incident where there was one. The next
  person needs the reason, not a restatement of the line below.
- `main` is protected by three jobs: `build-and-test`, `rls-isolation`, `e2e`.
  Green in isolation is not green after merge — rebase and re-run before
  trusting a PR that touches the same files as a recently merged one.

## For Codex, reviewing

Aim at the four rules above and at the verification discipline; those are where
real defects in this repo live. Two examples of the kind that matter, both
missed by types, tests and screenshots:

- `AcceptInviteState` was a copy of `AuthActionState`. One moved to `messageKey`
  and the copy did not. Structural typing kept it compiling, `AuthStatus`
  returned null, and the invite screen showed **no message at all** for three
  weeks.
- The forbidden-colour list was a fixed map while the declaration check had
  moved to names-only. Changing a token's value would silently un-forbid it.
  (Codex found this one.)

Findings are verified before they are applied. A correct diagnosis can still
carry a wrong fix: the literal form of the colour suggestion above would have
flagged seven files that were right.
