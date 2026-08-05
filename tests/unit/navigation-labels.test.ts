import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultAppNavigation } from "@/src/components/app-shell/config";

/**
 * Every sidebar entry must have a label in every language.
 *
 * DashboardShell builds the menu with `t(item.id)` in the `nav` namespace, and
 * next-intl has no custom onError here — so a missing key does not crash, it
 * renders the raw key path. The sidebar reads "nav.agenda" and the build, the
 * typecheck and CI all stay green. That is exactly what shipped on 2026-08-03,
 * and it reached production.
 *
 * A sweep rather than a list, so it covers menu entries nobody has added yet.
 */
const locales = readdirSync("messages").filter((file) => file.endsWith(".json"));

function navNamespace(locale: string): Record<string, string> {
  const json = JSON.parse(readFileSync(`messages/${locale}`, "utf8")) as { nav?: Record<string, string> };
  return json.nav ?? {};
}

describe("sidebar labels", () => {
  it("finds the locale files it claims to check", () => {
    // A glob that quietly matched nothing would make every test below pass.
    expect(locales.length).toBeGreaterThanOrEqual(9);
  });

  it("has at least one navigation entry to check", () => {
    expect(defaultAppNavigation.length).toBeGreaterThan(0);
  });

  for (const locale of locales) {
    it(`are all present in ${locale}`, () => {
      const nav = navNamespace(locale);
      const missing = defaultAppNavigation.map((item) => item.id).filter((id) => !(id in nav));
      // Named individually: "one label is missing" without saying which one is
      // a failure you still have to go and investigate.
      expect(missing, `menu entries with no nav label in ${locale}`).toEqual([]);
    });

    it(`are never left empty in ${locale}`, () => {
      // An empty string is a present key and an invisible menu item.
      const nav = navNamespace(locale);
      const blank = defaultAppNavigation
        .map((item) => item.id)
        .filter((id) => id in nav && nav[id].trim() === "");
      expect(blank, `menu entries with a blank label in ${locale}`).toEqual([]);
    });
  }
});
