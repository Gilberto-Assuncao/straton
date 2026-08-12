/**
 * The two rules behind the planning numbers that moved onto the work location
 * (#77): what a blank field means, and how a share of it is computed.
 *
 * Kept out of `actions.ts` and out of the panel — and free of `server-only` —
 * because both are decisions that regress silently. A budget that starts
 * reading as zero, or a percentage averaged instead of recomputed, produces a
 * screen that looks entirely normal and is wrong.
 */

export type OptionalNumber = { ok: true; value: number | null } | { ok: false };

/**
 * A number the manager may simply not have decided yet.
 *
 * Blank is `null`, never `0`, and that is the whole point: a location with no
 * budget written down has not spent nothing of it — there is nothing to have
 * spent. Stored as zero, it would show as 100% spent on its first day, and the
 * screen would be reporting a fact nobody entered.
 */
export function parseOptionalNumber(raw: string): OptionalNumber {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return { ok: false };
  return { ok: true, value };
}

/**
 * `part` as a whole percentage of `whole`, or null when there is nothing to be
 * a share of.
 *
 * Always recomputed from the two totals, never averaged from percentages that
 * were computed earlier — which is the failure this project already wrote down
 * for the multi-location report: hours sum, budgets sum, percentages do not.
 * The rule is the same one location at a time, and putting it here is what
 * stops the two screens from disagreeing.
 */
export function share(part: number, whole: number | null): number | null {
  if (whole === null || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}
