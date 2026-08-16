import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A ratchet on raw provider errors reaching the user (#27).
 *
 * Returning `error.message` straight to the screen is how `535 5.7.8
 * Authentication failed` and the literal string `{}` both ended up in front of
 * a customer, with nothing written down anywhere. The detail belongs in a log;
 * the user gets something they can act on.
 *
 * There are 9 of these left across 5 files. teams/actions.ts,
 * companies/actions.ts, sites/actions.ts, employees/actions.ts and both
 * operational-reports files all went to zero when their actions were converted
 * to typed message keys, and dropped off the list entirely — a raw Postgres string cannot be a key, so converting a file is
 * what forces its leaks to be given a sentence of their own. Fixing the rest
 * would be a large mechanical edit across features nobody is otherwise
 * touching.
 *
 * So this does not demand zero. It demands *no more than today*, per file, and
 * every fix tightens the budget automatically. The list can only ever shrink.
 */
const BUDGET: Record<string, number> = {
  "time-tracking/actions.ts": 3,
  "timesheets/actions.ts": 3,
  "projects/actions.ts": 1,
  "roster/actions.ts": 1,
  "account/actions.ts": 1,
};

const FEATURES = "src/features";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

/**
 * Counts reads of `.message` off anything named like an error.
 *
 * The prefix matters: a first pass matched only a bare `error.message` and
 * found 36, missing every `inviteError?.message`, `membershipError.message`
 * and `roleError.message` — 15 of them, including the SMTP one this whole
 * issue is named after. A ratchet that cannot see the defect it was built for
 * is worse than none, because it looks like cover.
 *
 * Comments are removed first. A doc comment explaining *why* a file no longer
 * returns `error.message` was itself counted as a leak, which put a file with
 * zero of them on the offenders list — the scan cannot tell prose from code, so
 * it is given no prose to read. Nothing is lost: a leak inside a comment is not
 * a leak.
 */
function countLeaks(file: string): number {
  const code = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  return (code.match(/\b\w*[Ee]rror\??\.message\b/g) ?? []).length;
}

describe("raw provider errors reaching the user", () => {
  const counts = new Map<string, number>();
  for (const file of sourceFiles(FEATURES)) {
    const key = file.replace(/\\/g, "/").replace(`${FEATURES}/`, "");
    const leaks = countLeaks(file);
    if (leaks > 0) counts.set(key, leaks);
  }

  it("finds the files it claims to be watching", () => {
    // A walk that quietly matched nothing would make every assertion below
    // pass forever.
    expect(sourceFiles(FEATURES).length).toBeGreaterThan(20);
  });

  it("never appears in a file that had none", () => {
    const newOffenders = [...counts.keys()].filter((file) => !(file in BUDGET));
    expect(newOffenders, "new files returning a raw provider error to the user").toEqual([]);
  });

  for (const [file, budget] of Object.entries(BUDGET)) {
    it(`does not grow in ${file}`, () => {
      const actual = counts.get(file) ?? 0;
      expect(actual, `${file} went from ${budget} to ${actual}`).toBeLessThanOrEqual(budget);
    });
  }

  it("reminds us to tighten the budget once a file is cleaned up", () => {
    // Not a failure — a nudge. A budget of 7 on a file that now has 3 is a
    // ratchet that has stopped ratcheting.
    const slack = Object.entries(BUDGET)
      .map(([file, budget]) => ({ file, budget, actual: counts.get(file) ?? 0 }))
      .filter((entry) => entry.actual < entry.budget);
    if (slack.length > 0) {
      console.info(
        `Budgets that can be lowered: ${slack.map((s) => `${s.file} ${s.budget}→${s.actual}`).join(", ")}`,
      );
    }
    expect(slack.every((entry) => entry.actual <= entry.budget)).toBe(true);
  });
});
