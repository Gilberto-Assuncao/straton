import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every foreground is readable on every surface it can land on.
 *
 * The dark palette was chosen against dark cards, and most of it inverts badly:
 * on white, the amber was 2.15:1, the red 2.77:1 and the body text 1.24:1 —
 * that last one is invisible, not merely hard. None of it would fail a type
 * check, a unit test or a build, and a screenshot of a page that happens to use
 * dark text would look fine.
 *
 * So the ratios are computed rather than trusted. WCAG 2.2 asks 4.5:1 of normal
 * text and 3:1 of a user-interface component; the focus ring is the second
 * kind, which is the one that got missed — the vivid brand green gave 2.28:1
 * against white and only a keyboard would ever find that out.
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
const TEXT = ["ink-bright", "ink", "ink-soft", "ink-muted", "ink-dim", "ink-subtle", "ink-faint", "brand-bright", "warning", "danger"];

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

  for (const name of TEXT) {
    it(`reads ${name} on every surface`, () => {
      const failures = SURFACES.map((surface) => ({
        surface,
        ratio: Number(contrast(token(name), token(surface)).toFixed(2)),
      })).filter((pair) => pair.ratio < 4.5);
      expect(failures, `${name} below 4.5:1`).toEqual([]);
    });
  }

  it("keeps the focus ring visible", () => {
    // 3:1, not 4.5:1 — it is a component boundary, not prose. Its own rule
    // because it is the one the eye does not catch: the ring is drawn on
    // whatever is behind the control, and a ring nobody can see is the same as
    // no ring for anyone navigating by keyboard.
    const ring = token("brand-bright");
    const failures = SURFACES.map((surface) => ({
      surface,
      ratio: Number(contrast(ring, token(surface)).toFixed(2)),
    })).filter((pair) => pair.ratio < 3);
    expect(failures, "focus ring below 3:1").toEqual([]);
  });

  it("keeps label and background legible on a brand fill", () => {
    // The one pair that is not foreground-on-surface: the primary button.
    expect(contrast(token("on-brand"), token("brand"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token("on-brand"), token("brand-hover"))).toBeGreaterThanOrEqual(4.5);
  });
});
