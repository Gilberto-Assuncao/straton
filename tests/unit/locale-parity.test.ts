import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every key in English exists, filled in, in every other language.
 *
 * The generalisation of the incident `navigation-labels.test.ts` guards: a
 * missing key does not crash, it renders the raw key path, and the build, the
 * typecheck and CI all stay green. That reached production once already, and
 * `nav.agenda` was visible to real users for seventy minutes.
 *
 * That test covers the sidebar. This one covers everything else — every screen,
 * including the ones nobody has written yet.
 */
const locales = readdirSync("messages").filter((file) => file.endsWith(".json"));

type Tree = { [key: string]: string | Tree };

function load(file: string): Tree {
  return JSON.parse(readFileSync(`messages/${file}`, "utf8")) as Tree;
}

/** Every leaf as a dotted path, so a failure names the key rather than a subtree. */
function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out.set(path, value);
    else for (const [nested, nestedValue] of leaves(value, path)) out.set(nested, nestedValue);
  }
  return out;
}

/** `{count}` and friends. A translation that drops one renders the braces raw. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)/g)].map((match) => match[1]).sort();
}

const english = leaves(load("en.json"));
const others = locales.filter((file) => file !== "en.json");

describe("translation coverage", () => {
  it("finds the locale files it claims to check", () => {
    // A glob that quietly matched nothing would make every test below pass.
    expect(locales.length).toBeGreaterThanOrEqual(9);
    expect(others.length).toBeGreaterThanOrEqual(8);
  });

  it("has a meaningful number of keys to compare", () => {
    expect(english.size).toBeGreaterThan(100);
  });

  for (const file of others) {
    const locale = file.replace(".json", "");
    const translated = leaves(load(file));

    it(`has every English key in ${locale}`, () => {
      const missing = [...english.keys()].filter((key) => !translated.has(key));
      expect(missing, `keys with no ${locale} translation`).toEqual([]);
    });

    it(`leaves none of them empty in ${locale}`, () => {
      // A present but empty key is worse than a missing one: it renders as
      // nothing at all, so the screen looks broken rather than untranslated.
      const blank = [...english.keys()].filter((key) => (translated.get(key) ?? "").trim() === "");
      expect(blank, `empty ${locale} translations`).toEqual([]);
    });

    it(`keeps the same placeholders in ${locale}`, () => {
      // `{count}` dropped in translation prints the literal braces, and a
      // renamed one throws at render time in next-intl.
      const mismatched = [...english.entries()]
        .filter(([key, value]) => {
          const other = translated.get(key);
          return other !== undefined && placeholders(value).join() !== placeholders(other).join();
        })
        .map(([key]) => key);
      expect(mismatched, `${locale} translations with different placeholders`).toEqual([]);
    });

    it(`carries no keys English has dropped in ${locale}`, () => {
      // Dead keys are how a removed string comes back: someone finds it in a
      // locale file and assumes the screen still uses it.
      const orphans = [...translated.keys()].filter((key) => !english.has(key));
      expect(orphans, `${locale} keys with no English original`).toEqual([]);
    });
  }
});
