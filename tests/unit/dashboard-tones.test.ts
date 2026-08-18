import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Colour does not travel as data (#82 follow-up).
 *
 * The dashboard's KPI cards and attention rows were coloured from
 * `src/features/dashboard/data.ts`, which handed hexadecimals to
 * `style={{ color }}`: `#F59E0B`, `#4ADE80`, `#F87171`, `#94A3B8`. All four
 * are pale shades chosen to read on navy, and on the light theme's white
 * surface they measure 2.15:1, 1.74:1, 2.77:1 and 2.56:1 — every one below the
 * 4.5:1 WCAG asks of normal text.
 *
 * They survived the sweep that fixed 104 of these in JSX, and the reason is
 * worth writing down: `color-tokens.test.ts` scans for class names, and a
 * value that never was a class name is invisible to it. A rule enforced by
 * reading `className` cannot see a colour that arrives through a prop.
 *
 * So this watches the seam rather than the values: no hexadecimals in the
 * layer that feeds the screen, and no inline `style` colouring in the
 * components that render it.
 */
const DATA_LAYER = "src/features/dashboard/data.ts";
const RENDERERS = ["components/dashboard/RoleOverview.tsx", "components/dashboard/KpiCard.tsx"];

/** Comments stripped: prose naming the old colours is not a leak. */
function code(file: string): string {
  return readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("dashboard colour", () => {
  it("reads the files it claims to watch", () => {
    // A path that quietly stopped matching would make every assertion below
    // pass forever.
    expect(code(DATA_LAYER).length, DATA_LAYER).toBeGreaterThan(2000);
    for (const file of RENDERERS) expect(code(file).length, file).toBeGreaterThan(300);
  });

  it("never leaves the data layer as a hexadecimal", () => {
    const found = code(DATA_LAYER).match(/#[0-9A-Fa-f]{6}/g) ?? [];
    expect(found, `hardcoded colours in ${DATA_LAYER}`).toEqual([]);
  });

  it("never colours through an inline style", () => {
    // `style={{ color: kpi.color }}` is how the four got past every guard in
    // this repository. It cannot be themed and it cannot be scanned.
    const offenders = RENDERERS.filter((file) => /style=\{\{[^}]*(color|background|border)/i.test(code(file)));
    expect(offenders, "components colouring from a prop instead of a token").toEqual([]);
  });

  it("resolves every tone the data layer can produce", () => {
    // A tone with no entry renders `undefined` into the class list, which is
    // not an error anywhere — the text simply comes out unstyled.
    const source = readFileSync(DATA_LAYER, "utf8");
    const declared = [...source.matchAll(/export type DashboardTone =([^;]+);/g)]
      .flatMap((match) => [...match[1].matchAll(/"(\w+)"/g)].map((m) => m[1]));
    expect(declared.length, "tones parsed from the union").toBeGreaterThan(2);

    const map = readFileSync(RENDERERS[0], "utf8");
    const missing = declared.filter((tone) => !new RegExp(`\\b${tone}:\\s*\\{`).test(map));
    expect(missing, "tones with no entry in the TONE map").toEqual([]);

    // And every tone the data layer actually emits is one the union declares.
    const emitted = new Set([...source.matchAll(/\btone:[^,\n]*?"(\w+)"/g)].map((m) => m[1]));
    expect([...emitted].filter((t) => !declared.includes(t)), "tones emitted but not declared").toEqual([]);
  });

  it("builds tone classes Tailwind can see", () => {
    /*
     * `text-${tone}` yields a class name that never exists at build time, so
     * the utility is never generated and the colour is silently absent.
     *
     * The first version of this anchored to the backtick — `` /`(text|bg|border)-\$\{/ ``
     * — and therefore saw only an interpolation at the very start of a template.
     * It missed `` `mt-2 text-${tone}` ``, and it missed `` `border-l-${tone}` ``,
     * which is the *exact* form this component uses. My own negative test
     * passed because I broke it in the one shape the pattern happened to catch.
     * (Found in review of #118.)
     *
     * Now: any utility-looking word ending in `-` immediately before an
     * interpolation, anywhere in the template.
     */
    const DYNAMIC = /\b[a-z][a-z-]*-\$\{/;

    // The pattern is checked against the cases it exists for, because a regex
    // that matches nothing is the failure this whole file is about.
    expect(DYNAMIC.test("`text-${tone}`"), "leading interpolation").toBe(true);
    expect(DYNAMIC.test("`mt-2 text-${tone}`"), "mid-template interpolation").toBe(true);
    expect(DYNAMIC.test("`border-l-${tone}`"), "side-specific prefix").toBe(true);
    // And not on the legitimate shape this component actually uses, where the
    // whole class name comes out of the lookup rather than being assembled.
    expect(DYNAMIC.test("`${TONE[item.tone].edge} bg-surface-inset`"), "whole class from a lookup").toBe(false);
    expect(DYNAMIC.test("`/dashboard/${id}`"), "a path, not a class").toBe(false);

    for (const file of RENDERERS) {
      expect(code(file), `${file} assembles a class name Tailwind cannot see`).not.toMatch(DYNAMIC);
    }
  });
});

/**
 * The dashboard stays reduced.
 *
 * Seven blocks were stacked down this page. The four that were removed each
 * have their own route and their own menu entry — which is *why* they could be
 * removed, and is the part that would quietly stop being true.
 */
describe("the dashboard page", () => {
  const page = code("app/[locale]/dashboard/page.tsx");

  /** Blocks that left, and the page every role can still reach them on. */
  const RELOCATED = [
    { component: "LiveMapPreview", href: "/dashboard/map" },
    { component: "RecentTimesheets", href: "/dashboard/timesheets" },
  ];

  /**
   * A menu entry and whether it is gated, in whatever form the gate is written.
   *
   * `defaultAppNavigation` is filtered by `item.roles` in `DashboardShell`
   * before it reaches the sidebar, so an href appearing in the config is not
   * the same as somebody being able to reach it.
   *
   * The value matters as much as the key. A first attempt matched only
   * `roles: [ … ]` and reported `/dashboard/reports` as open to everybody; it
   * is written `roles: managerRoles`, and that miscount is what produced the
   * claim that this review was mistaken. It was not.
   */
  function navEntry(href: string): { found: boolean; gated: boolean } {
    const nav = readFileSync("src/components/app-shell/config.ts", "utf8");
    const block = nav.match(new RegExp(`\\{[^{}]*href:\\s*"${href}"[^{}]*\\}`));
    return { found: Boolean(block), gated: block ? /\broles:/.test(block[0]) : false };
  }

  it("parses the navigation it is judging", () => {
    // Both answers have to be reachable, or the assertions below are decoration:
    // one entry with no gate, one with a gate written as an identifier.
    expect(navEntry("/dashboard/map"), "an open entry").toEqual({ found: true, gated: false });
    expect(navEntry("/dashboard/reports"), "an identifier-gated entry").toEqual({ found: true, gated: true });
    expect(navEntry("/dashboard/nowhere").found, "a route that does not exist").toBe(false);
  });

  it("keeps the relocated blocks off the page", () => {
    const back = RELOCATED.filter(({ component }) => page.includes(component));
    expect(back.map((b) => b.component), "blocks back on the dashboard").toEqual([]);
  });

  for (const { component, href } of RELOCATED) {
    it(`still reaches ${component} from the menu, for every role`, () => {
      // Relocating is only relocating while the destination is reachable by
      // the person who lost the block. Gate this route and it becomes a
      // removal, silently, for exactly the people least able to say so.
      const entry = navEntry(href);
      expect(entry.found, `no navigation entry for ${href}`).toBe(true);
      expect(entry.gated, `${href} is gated by role, so ${component} is gone rather than moved`).toBe(false);
      expect(statSync(join("app/[locale]", href.replace("/dashboard", "dashboard"))).isDirectory()).toBe(true);
    });
  }

  it("leaves a worker their own week", () => {
    /*
     * `/dashboard/reports` is `managerRoles`. Taking the chart off this page
     * without noticing that left a worker with no hours and nowhere to see
     * them — the one thing they open this screen for.
     *
     * So the chart stays on the non-role branch. If somebody removes it again,
     * this fails and names the reason rather than leaving it to be rediscovered.
     */
    expect(navEntry("/dashboard/reports").gated, "reports is no longer gated — this test can be reconsidered").toBe(true);
    // The rendered tag, not the identifier: the first version of this passed on
    // the `import` line alone, so deleting the chart from the JSX left the
    // guard green. A component that is imported and never rendered is exactly
    // the shape of the defect this file was written for.
    expect(page, "the weekly hours chart is a worker's only view of their week").toMatch(/<WeeklyHoursChart[\s/]/);
  });

  it("does not fetch what it no longer shows", () => {
    // `getDashboardOverview()` runs six queries for blocks this page dropped.
    // Left unconditional it did all of that on every load and discarded it.
    expect(page).toMatch(/roleOverview\.roleView \? null : await getDashboardOverview\(\)/);
  });
});
