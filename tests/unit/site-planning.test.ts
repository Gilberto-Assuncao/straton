import { describe, expect, it } from "vitest";
import { parseOptionalNumber, share } from "@/src/features/sites/planning";

/**
 * The planning numbers that moved from the project onto the work location
 * (#77).
 *
 * Both rules here fail silently when they break. A blank budget stored as zero
 * renders a perfectly normal-looking screen that says the job is fully spent on
 * its first day, and a percentage taken the wrong way round is still a
 * percentage. Neither would throw, and neither would look wrong.
 */
describe("a planning number that was left blank", () => {
  it("is nothing, not zero", () => {
    // The distinction the whole file exists for. `0` is a decision — "this job
    // has no budget" — and `null` is the absence of one.
    expect(parseOptionalNumber("")).toEqual({ ok: true, value: null });
    expect(parseOptionalNumber("   ")).toEqual({ ok: true, value: null });
    expect(parseOptionalNumber("0")).toEqual({ ok: true, value: 0 });
  });

  it("accepts the decimals a budget is written in", () => {
    expect(parseOptionalNumber("1250.75")).toEqual({ ok: true, value: 1250.75 });
    expect(parseOptionalNumber(" 37.5 ")).toEqual({ ok: true, value: 37.5 });
  });

  it("refuses what is not a positive number", () => {
    expect(parseOptionalNumber("-1").ok).toBe(false);
    expect(parseOptionalNumber("abc").ok).toBe(false);
    // `Number("")` is 0 and `Number(" ")` is 0, which is exactly how a blank
    // field becomes a budget of zero. Blank is handled above; this is the
    // other half — nothing else may take that path.
    expect(parseOptionalNumber("1e").ok).toBe(false);
    expect(parseOptionalNumber("Infinity").ok).toBe(false);
  });
});

describe("a share of a planned total", () => {
  it("is null when nothing was planned", () => {
    // Not "0%". Zero would be a claim about a number nobody entered, and the
    // panel decides whether to print anything at all from this being null.
    expect(share(480, null)).toBeNull();
    expect(share(480, 0)).toBeNull();
  });

  it("is computed from the totals", () => {
    expect(share(480, 960)).toBe(50);
    expect(share(0, 960)).toBe(0);
  });

  it("goes past 100 rather than stopping there", () => {
    // A job that has overrun is the one thing on this panel worth seeing at a
    // glance. Clamping to 100 would hide precisely the case the number is
    // there for.
    expect(share(1920, 960)).toBe(200);
  });

  it("does not average percentages", () => {
    /*
     * The trap written down when the multi-location report was designed:
     * hours sum, budgets sum, percentages do not. Two locations at 100% and 0%
     * are not a job at 50% unless they happen to be the same size.
     *
     * Same rule one location at a time, which is why both screens call this
     * function instead of each computing their own.
     */
    const combined = share(100 + 0, 100 + 900);
    expect(combined).toBe(10);
    expect(combined).not.toBe(Math.round((100 + 0) / 2));
  });
});
