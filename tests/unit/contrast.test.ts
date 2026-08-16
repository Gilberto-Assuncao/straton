import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every foreground is readable on every surface it can land on.
 *
 * The palette comes from the identity handoff, and a handoff is a table of
 * hexadecimals — nothing in it proves the pairs work. Two of them did not: the
 * gray-scale values that had drifted in beside the documented slate ones were
 * never checked against anything, and `--text-muted` is below AA against all
 * three of the backgrounds the same document specifies.
 *
 * None of that fails a type check, a unit test or a build, and it is invisible
 * in a screenshot to anyone who can read the screen. So the ratios are computed.
 *
 * WCAG 2.2 asks 4.5:1 of normal text and 3:1 of large text and interface
 * components. `ink-subtle`/`ink-faint` is held to the second, deliberately —
 * see the note in `globals.css`. Raising it is a change to the identity.
 *
 * The values are read out of `globals.css` rather than repeated here. A test
 * carrying its own copy of the palette passes happily while the product ships
 * something else.
 */
const css = readFileSync("app/globals.css", "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`no --${name} in globals.css`);
  return match[1];
}

/** WCAG relative luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Anything a foreground can sit on. */
const SURFACES = ["canvas", "surface", "surface-inset", "surface-alt", "surface-deep"];

/** Read as prose, so 4.5:1. */
const PROSE = ["ink-bright", "ink", "ink-soft", "ink-muted", "ink-dim", "brand", "brand-bright", "warning", "danger"];

/** Captions and metadata. The identity puts these below AA; see globals.css. */
const SUPPORTING = ["ink-subtle", "ink-faint"];

function failures(name: string, floor: number) {
  return SURFACES.map((surface) => ({
    surface,
    ratio: Number(contrast(token(name), token(surface)).toFixed(2)),
  })).filter((pair) => pair.ratio < floor);
}

describe("colour contrast", () => {
  it("agrees with a value it can check by hand", () => {
    // Black on white is 21:1 by definition. A luminance function with a wrong
    // exponent still returns plausible-looking numbers for everything else.
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("reads the palette out of globals.css", () => {
    // A regex that quietly matched nothing would compare undefined to
    // undefined for every pair below.
    expect(SURFACES.map(token).every((v) => /^#[0-9a-f]{6}$/i.test(v))).toBe(true);
    expect(new Set(SURFACES.map(token)).size).toBeGreaterThan(1);
  });

  for (const name of PROSE) {
    it(`reads ${name} on every surface`, () => {
      expect(failures(name, 4.5), `${name} below 4.5:1`).toEqual([]);
    });
  }

  for (const name of SUPPORTING) {
    it(`keeps ${name} above the large-text floor`, () => {
      expect(failures(name, 3), `${name} below 3:1`).toEqual([]);
    });
  }

  it("keeps the focus ring visible", () => {
    // 3:1, not 4.5:1 — it is a component boundary, not prose. Its own test
    // because it is the one the eye does not catch: a ring nobody can see is
    // the same as no ring for anyone navigating by keyboard.
    expect(failures("brand", 3), "focus ring below 3:1").toEqual([]);
  });

  it("keeps the label legible on a brand fill", () => {
    // The one pair that is not foreground-on-surface: the primary button.
    expect(contrast(token("on-brand"), token("brand"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("on-brand"), token("brand-hover"))).toBeGreaterThanOrEqual(4.5);
  });
});
