import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The palette stays in one place.
 *
 * There were three definitions of this product's colours and only one of them
 * rendered anything: a `:root` block in `globals.css` used zero times, a
 * `colors` object in `src/design-system/tokens.ts` imported by nothing, and
 * 1826 hexadecimals written straight into 159 component files. The two written
 * down disagreed with the one in use *and* with each other.
 *
 * That is why the background could not be made white. There was no lever —
 * changing a token changed nothing, and changing the components meant 159
 * files, with pale grey text left on white anywhere the sweep missed.
 *
 * Two rules below, of different strengths. A hexadecimal that has a token is
 * simply not allowed: writing `bg-[#161A34]` again puts the palette back where
 * it was, one file at a time, and there is never a reason to. What is left over
 * — SVG gradients, chart and map palettes, a handful of one-off shades — is a
 * budget that can only shrink, because each of those needs a decision rather
 * than a rename.
 */
const TOKEN_NAMES = [
  "brand", "brand-hover", "brand-bright", "on-brand",
  "ink-bright", "ink", "ink-soft", "ink-muted", "ink-dim", "ink-subtle", "ink-faint",
  "canvas", "surface", "surface-inset", "surface-alt", "surface-deep",
  "warning", "danger",
];

/**
 * Hexadecimals that must not be written into a component again.
 *
 * Both palettes, not just the current one. The light values because writing
 * `bg-[#ffffff]` puts the fork back; the dark ones they replaced because those
 * are what is in every screenshot, every old branch and every memory of this
 * codebase, and pasting one back is the easiest mistake available.
 */
const FORBIDDEN: Record<string, string> = {
  // In use.
  "22c55e": "brand", "16a34a": "brand-hover", "166534": "brand-bright", "07110b": "on-brand",
  "0f172a": "ink-bright", "1e293b": "ink", "334155": "ink-soft",
  "4b5563": "ink-muted", "475569": "ink-dim",
  f8fafc: "canvas", ffffff: "surface", f1f5f9: "surface-inset", e2e8f0: "surface-deep",
  "92400e": "warning", b91c1c: "danger",
  // Retired with the dark theme.
  "4ade80": "brand-bright", f5f9ff: "ink-bright", e5e7eb: "ink", d1d5db: "ink-soft",
  "9ca3af": "ink-muted", "94a3b8": "ink-dim", "6b7280": "ink-subtle", "64748b": "ink-faint",
  "0b1220": "canvas", "161a34": "surface", "111c33": "surface-inset", "111827": "surface-alt",
  f59e0b: "warning", f87171: "danger",
};

/**
 * What is not a rename, per file.
 *
 * SVG `stopColor` and `stroke`, colours handed to the chart and map libraries,
 * and shades used once or twice that no honest name fits yet. Each needs
 * somebody to decide what it *means* before it can have a token, so they are
 * counted rather than forbidden.
 */
const BUDGET: Record<string, number> = {
  "app/[locale]/dashboard-preview/page.tsx": 39,
  "src/features/dashboard/data.ts": 22,
  "src/design-system/tokens.ts": 12,
  "app/[locale]/page.tsx": 9,
  "src/components/ui/StratonMark.tsx": 6,
  "components/settings/SettingsHub.tsx": 6,
  "src/components/maps/Maps.tsx": 3,
  "src/components/charts/Charts.tsx": 3,
  "src/components/ui/Button.tsx": 2,
  "components/dashboard/LiveMapPreview.tsx": 2,
  "src/features/teams/data.ts": 1,
  "src/features/teams/components/TeamForm.tsx": 1,
  "src/components/forms/Fields.tsx": 1,
  "components/sites/SitePartners.tsx": 1,
  "components/sites/SiteNotificationAudience.tsx": 1,
  "components/sites/SiteAreas.tsx": 1,
  "components/sites/IncomingInvitations.tsx": 1,
  "components/companies/InviteNewCompany.tsx": 1,
  "components/companies/AcceptCompanyInvite.tsx": 1,
  "components/availability/AvailabilityForm.tsx": 1,
  "components/agenda/RescheduleForm.tsx": 1,
  "components/agenda/AssignmentForm.tsx": 1,
};

const ROOTS = ["components", "src", "app"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(full) ? [full.replace(/\\/g, "/")] : [];
  });
}

const files = ROOTS.flatMap(sourceFiles);

describe("colour tokens", () => {
  it("finds the files it claims to be checking", () => {
    // A walk that quietly matched nothing would make every assertion below
    // pass forever — the same failure this suite caught in its own build
    // comparison, where a wrong glob compared zero colours against zero and
    // reported them equal.
    expect(files.length).toBeGreaterThan(150);
  });

  it("declares every token, and exposes it to Tailwind", () => {
    // By name, not by value: the values are the theme and are meant to change.
    // What must not change is that each one exists and reaches a utility —
    // `tests/unit/contrast.test.ts` is where the values are held to account.
    const css = readFileSync("app/globals.css", "utf8").toLowerCase();
    const missing = TOKEN_NAMES.filter(
      (name) => !new RegExp(`--${name}:\\s*\\S`).test(css) || !css.includes(`--color-${name}: var(--${name})`),
    );
    expect(missing, "tokens not declared, or not exposed to Tailwind").toEqual([]);
  });

  it("never draws an edge with translucent white", () => {
    // `border-white/10` is how you outline a card on a dark surface, and it is
    // nothing at all on a light one. 412 of them were the reason the theme
    // could not simply be flipped; the `edge` scale carries the same ratios
    // through both themes, so writing `white/N` again re-breaks it.
    const offenders: string[] = [];
    for (const file of files) {
      for (const match of readFileSync(file, "utf8").matchAll(/-white\/(\d+)/g)) {
        offenders.push(`${file}: white/${match[1]} is \`edge-${match[1]}\``);
      }
    }
    expect(offenders, "translucent white where an edge token belongs").toEqual([]);
  });

  it("never writes a hexadecimal that already has a token", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/-\[#([0-9A-Fa-f]{6})\]/g)) {
        const token = FORBIDDEN[match[1].toLowerCase()];
        if (token) offenders.push(`${file}: #${match[1]} is \`${token}\``);
      }
    }
    expect(offenders, "hardcoded colours that have a token").toEqual([]);
  });

  it("never appears in a file that had none", () => {
    const fresh = files.filter(
      (file) => !(file in BUDGET) && /#[0-9A-Fa-f]{6}/.test(readFileSync(file, "utf8")),
    );
    expect(fresh, "new files with a hardcoded colour").toEqual([]);
  });

  for (const [file, budget] of Object.entries(BUDGET)) {
    it(`does not grow in ${file}`, () => {
      const found = (readFileSync(file, "utf8").match(/#[0-9A-Fa-f]{6}/g) ?? []).length;
      expect(found, `${file} went from ${budget} to ${found}`).toBeLessThanOrEqual(budget);
    });
  }
});
