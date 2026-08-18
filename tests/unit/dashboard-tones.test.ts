import { readFileSync, readdirSync, statSync } from "node:fs";
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
    // `text-${tone}` yields a class name that never exists at build time, so
    // the utility is never generated and the colour is silently absent.
    const map = code(RENDERERS[0]);
    expect(map).not.toMatch(/`(text|bg|border)-\$\{/);
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
  const MOVED = [
    { component: "WeeklyHoursChart", href: "/dashboard/reports" },
    { component: "LiveMapPreview", href: "/dashboard/map" },
    { component: "RecentTimesheets", href: "/dashboard/timesheets" },
    { component: "TeamActivity", href: "/dashboard/teams" },
  ];

  it("keeps the heavy blocks off it", () => {
    const back = MOVED.filter(({ component }) => page.includes(component));
    expect(back.map((b) => b.component), "blocks back on the dashboard").toEqual([]);
  });

  for (const { component, href } of MOVED) {
    it(`still reaches ${component} from the menu`, () => {
      // Removing a block is only safe while its page is one click away. If a
      // menu entry goes, the block became unreachable rather than relocated.
      const nav = readFileSync("src/components/app-shell/config.ts", "utf8");
      expect(nav, `no navigation entry for ${href}`).toContain(`"${href}"`);
      const routeDir = join("app/[locale]", href.replace("/dashboard", "dashboard"));
      expect(statSync(routeDir).isDirectory(), `${routeDir} does not exist`).toBe(true);
    });
  }

  it("finds the route tree it is checking against", () => {
    const routes = readdirSync("app/[locale]/dashboard").filter((entry) =>
      statSync(join("app/[locale]/dashboard", entry)).isDirectory(),
    );
    expect(routes.length, "dashboard routes found").toBeGreaterThan(10);
  });
});
