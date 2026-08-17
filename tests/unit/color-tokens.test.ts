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
 * Hexadecimals that were the palette once and must not come back by hand.
 *
 * Historical only. The values *currently* in use are read out of `globals.css`
 * instead — see `forbidden()` — because a fixed list of both goes stale the
 * moment a theme changes a token, which the name-only declaration check above
 * deliberately allows. A component could then hardcode the new value and this
 * suite would say nothing, which is the fork it exists to prevent.
 *
 * These are the ones already retired: Tailwind's *gray* scale that had drifted
 * in beside the slate one, and the card surface that appears nowhere in the
 * identity handoff.
 */
const RETIRED: Record<string, string> = {
  // Empty, and correctly so: no token has changed value yet. The light theme
  // (#109) was built and rejected without ever being merged, so its values were
  // never the palette — and listing them here would be wrong twice over, since
  // `#4B5563` and `#475569` are in legitimate use as one-off shades that no
  // token covers. An entry belongs here only once a value has actually been
  // replaced in `globals.css`.
};

/** Every token's current value, read from the stylesheet that renders. */
function currentPalette(): Record<string, string> {
  const css = readFileSync("app/globals.css", "utf8");
  const found: Record<string, string> = {};
  for (const name of TOKEN_NAMES) {
    const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
    if (match) found[match[1].slice(1).toLowerCase()] = name;
  }
  return found;
}

/** What is in use today, plus everything that ever was. */
function forbidden(): Record<string, string> {
  return { ...RETIRED, ...currentPalette() };
}

/**
 * What is not a rename, per file.
 *
 * SVG `stopColor` and `stroke`, colours handed to the chart and map libraries,
 * and shades used once or twice that no honest name fits yet. Each needs
 * somebody to decide what it *means* before it can have a token, so they are
 * counted rather than forbidden.
 */
const BUDGET: Record<string, number> = {
  "app/[locale]/dashboard-preview/page.tsx": 44,
  "src/features/dashboard/data.ts": 22,
  "src/design-system/tokens.ts": 12,
  // Restored to its pre-token form; see EXEMPT.
  "app/[locale]/page.tsx": 174,
  "src/components/ui/StratonMark.tsx": 6,
  "components/settings/SettingsHub.tsx": 6,
  "src/components/ui/Button.tsx": 3,
  "src/components/maps/Maps.tsx": 3,
  "src/components/charts/Charts.tsx": 3,
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
  "components/agenda/AgendaWeek.tsx": 1,
};

/**
 * Files kept out of the token rules on purpose.
 *
 * The landing page was restored to its pre-token form at the owner's request,
 * so its 174 colours are written by hand again and that is the intended state
 * — not drift for a later sweep to find. It is listed here rather than
 * silently passing, so the next person sees a decision instead of a gap.
 */
const EXEMPT = new Set(["app/[locale]/page.tsx"]);

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
    // By name, not by value. The values belong to the identity handoff and are
    // held to account by `tests/unit/contrast.test.ts`; what must not change is
    // that each token exists and reaches a utility.
    const css = readFileSync("app/globals.css", "utf8").toLowerCase();
    const missing = TOKEN_NAMES.filter(
      (name) => !new RegExp(`--${name}:\\s*\\S`).test(css) || !css.includes(`--color-${name}: var(--${name})`),
    );
    expect(missing, "tokens not declared, or not exposed to Tailwind").toEqual([]);
  });

  it("derives the forbidden values from the stylesheet", () => {
    // The point of the rewrite: a fixed list would stop covering a token the
    // moment its value changed, and nothing would say so. If this regex ever
    // matches nothing, every check below silently passes.
    const palette = currentPalette();
    const uncovered = TOKEN_NAMES.filter((name) => !Object.values(palette).includes(name));
    expect(uncovered, "tokens whose value could not be read from globals.css").toEqual([]);
  });

  it("never draws an edge with translucent white", () => {
    // `border-white/10` is how a card is outlined on a dark surface and is
    // nothing at all on a light one. 412 of them were what stood between this
    // palette and a second theme; the `edge` scale carries the same ratios
    // through both, so writing `white/N` again re-breaks it.
    const offenders: string[] = [];
    for (const file of files) {
      if (EXEMPT.has(file)) continue;
      for (const match of readFileSync(file, "utf8").matchAll(/-white\/(\d+)/g)) {
        offenders.push(`${file}: white/${match[1]} is \`edge-${match[1]}\``);
      }
    }
    expect(offenders, "translucent white where an edge token belongs").toEqual([]);
  });

  it("never writes a hexadecimal that already has a token", () => {
    const table = forbidden();
    const offenders: string[] = [];
    for (const file of files) {
      if (EXEMPT.has(file)) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/-\[#([0-9A-Fa-f]{6})\]/g)) {
        const token = table[match[1].toLowerCase()];
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
