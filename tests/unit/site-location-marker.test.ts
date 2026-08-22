import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The pin corrects the position; the numbers stay off the screen (#120).
 *
 * `SiteForm` geocodes the address and hides the result, and the reason is
 * written above the hidden fields: "nobody knows the latitude of a roof, and a
 * pair of decimals on screen is a number a site manager cannot check, cannot
 * correct and cannot act on". Hiding them answered "cannot use". Nothing
 * answered "cannot correct" until the pin.
 *
 * What is guarded here is the seam between those two halves — the places where
 * this would come apart without anything failing.
 */
const PICKER = "src/components/maps/SiteLocationPicker.tsx";
const FORM = "components/sites/SiteForm.tsx";

/** Comments stripped: prose about coordinates is not a coordinate on screen. */
function code(file: string): string {
  return readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("the site location marker", () => {
  it("reads the files it claims to watch", () => {
    // A path that quietly stopped matching would make everything below pass.
    expect(code(PICKER).length, PICKER).toBeGreaterThan(1500);
    expect(code(FORM).length, FORM).toBeGreaterThan(2000);
  });

  it("never puts a coordinate on the screen", () => {
    /*
     * The rule the whole feature exists to keep. A latitude rendered as text —
     * in a label, a title, a readout under the map — undoes the decision that
     * made this worth building, and nothing would fail: it would simply be
     * there, and unreadable to the person it is shown to.
     *
     * Hidden inputs are how the value reaches the server and are not a screen.
     */
    const rendered = code(FORM).replace(/<input type="hidden"[^>]*\/>/g, "");
    expect(rendered, "a coordinate rendered as text").not.toMatch(/\{\s*fields\.(latitude|longitude)\s*\}/);
    expect(code(PICKER), "a coordinate rendered as text").not.toMatch(/\{\s*(latitude|longitude)\s*\}/);
  });

  it("keeps Leaflet out of the server pass", () => {
    // It reads `window` at import time. A static import compiles and then fails
    // at build, which is loud — but the dynamic form also documents *why*, and
    // `ssr: false` is the half that a refactor could drop while still building.
    expect(code(FORM)).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\("@\/src\/components\/maps\/SiteLocationPicker"\)/);
    expect(code(FORM)).toMatch(/ssr:\s*false/);
    /*
     * A *value* import at module scope is the problem. `import type` is erased
     * before the bundle exists and never runs anything, and the stylesheet
     * import touches no globals — the first version of this rejected both, and
     * was wrong about the code rather than the code being wrong.
     */
    const valueImports = [...code(PICKER).matchAll(/^import\s+(?!type\s)([^;]*?)\s+from\s+"leaflet"/gm)];
    expect(valueImports.map((m) => m[1]), "Leaflet imported as a value at module scope").toEqual([]);
  });

  it("takes the tile source from configuration, never from code", () => {
    /*
     * Every tile requested tells the provider where a customer's sites are,
     * which is why the provider is a decision (#54) and not a default. A URL
     * written here would lock it in silently — the map would work, and the
     * decision would have been made by whoever typed fastest.
     */
    expect(code(PICKER)).toContain("process.env.NEXT_PUBLIC_MAP_TILE_URL");
    expect(code(PICKER), "a tile URL hardcoded").not.toMatch(/https?:\/\/[^\s"']*\{[zxy]\}/);
  });

  it("resets to the geocoder's answer, not to the last drag", () => {
    /*
     * The subtle one. If a drag also wrote the reset target, the button would
     * still be there, still be clickable, and reset the pin to where it already
     * is — a control that looks like it works and does nothing.
     *
     * So `setGeocoded` may appear only in the geocode handler. The drag path
     * writes `fields`, and nothing else.
     */
    const form = code(FORM);
    const writes = [...form.matchAll(/setGeocoded\(/g)];
    expect(writes.length, "setGeocoded is called somewhere").toBeGreaterThan(0);
    expect(writes.length, "setGeocoded is written from more than one place").toBe(1);

    // And that one place is the geocode result, not the change handler.
    const around = form.slice(Math.max(0, writes[0].index - 400), writes[0].index);
    expect(around, "setGeocoded is not beside the geocode result").toContain("result.latitude");
  });

  it("only offers the map once there is a position", () => {
    // A pin on nothing is the loose coordinate this product decided not to
    // have: it would invite somebody to place a site that has no address.
    expect(code(FORM)).toMatch(/\{located \?[\s\S]{0,400}<SiteLocationPicker/);
  });
});

/**
 * The pin is drawn from tokens, and the classes survive the build.
 *
 * Leaflet's own marker is a PNG resolved from its stylesheet's path, which a
 * bundler rewrites and then cannot find. Ours is a `divIcon` carrying utility
 * classes — which means the class names live inside a *string*, and a scanner
 * that missed them would generate no CSS and leave an invisible pin. Nothing
 * would error; the map would simply have nothing on it.
 */
describe("the pin's classes reach the stylesheet", () => {
  function builtCss(): string {
    const dir = ".next/static/chunks";
    let found = "";
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith(".css")) continue;
      const full = join(dir, entry);
      if (statSync(full).size > found.length) found = readFileSync(full, "utf8");
    }
    return found;
  }

  it("finds a stylesheet to read", () => {
    // Needs `next build` first, which the CI job runs before this suite.
    expect(builtCss().length, "no built CSS under .next/static/chunks").toBeGreaterThan(10000);
  });

  it("generates every utility the marker uses", () => {
    const icon = code(PICKER).match(/html:\s*'([^']*)'/);
    expect(icon, "the divIcon markup could not be parsed").not.toBeNull();

    const classes = (icon![1].match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/).filter(Boolean);
    expect(classes.length, "no classes parsed from the marker").toBeGreaterThan(3);

    const css = builtCss();
    const missing = classes.filter((c) => !css.includes(`.${c.replace(/[.:/[\]]/g, "\\$&")}`));
    expect(missing, "marker classes with no CSS generated — an invisible pin").toEqual([]);
  });
});
