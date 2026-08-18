import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  applyPreference,
  readPreference,
  subscribeToPreference,
  syncFromStorage,
  type ThemePreference,
} from "@/src/components/app-shell/theme";

/**
 * The theme switch is wired to something (#82).
 *
 * `ThemeSwitcher.tsx` existed for weeks before this — three states, all ten
 * translations, a `select` that looked finished — and it was imported by
 * nothing. It rendered on no screen. Nothing failed: not `tsc`, which is happy
 * to compile an unused export; not `locale-parity`, which found every key it
 * was told to look for; not a screenshot, because the control was not on the
 * page to be missing from it. The issue was closed with its plan two thirds
 * done.
 *
 * So the assertions below are mostly about wiring rather than behaviour. The
 * behaviour is three lines of `dataset` and `localStorage`; what actually goes
 * wrong is a piece that is built and never connected, or two pieces connected
 * by a string that only one of them changes.
 */

/**
 * The pages `next build` actually produced.
 *
 * Absent `.next`, this throws instead of returning `[]`: the CI job builds
 * before it tests precisely so these exist, and a silent empty list would turn
 * the assertions above into decoration.
 */
function prerendered(): { name: string; html: string }[] {
  const root = ".next/server/app";
  if (!existsSync(root)) {
    throw new Error("no .next/server/app — run `next build` before this suite (the CI job does)");
  }
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : full.endsWith(".html") ? [full] : [];
    });
  return walk(root)
    // Next's own fallbacks. They render outside the `[locale]` layout — that is
    // what makes them fallbacks — so the theme script is not theirs to carry.
    .filter((file) => !/_not-found\.html$|_global-error\.html$/.test(file))
    .map((file) => ({ name: file, html: readFileSync(file, "utf8") }));
}

const css = readFileSync("app/globals.css", "utf8");

/** The declarations inside a `{ … }` block, normalised for comparison. */
function declarations(block: string): string[] {
  return block
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("--"));
}

function blockAfter(marker: string): string {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`no ${marker} in globals.css`);
  const open = css.indexOf("{", start);
  return css.slice(open + 1, css.indexOf("\n}", open));
}

describe("theme preference", () => {
  it("keeps anything unrecognised on the system default", () => {
    // A stale value, another product's key, a half-written string. None of
    // these may become a theme, and none may throw.
    expect(readPreference("light")).toBe("light");
    expect(readPreference("dark")).toBe("dark");
    expect(readPreference("system")).toBe("system");
    expect(readPreference(null)).toBe("system");
    expect(readPreference("Dark")).toBe("system");
    expect(readPreference("")).toBe("system");
  });

  it("writes the attribute for a choice and removes it for the system", () => {
    // `system` must clear the attribute, not set it to "system": the stylesheet
    // decides by the attribute's *absence*, and `[data-theme="system"]` would
    // match neither rule and pin everybody to dark.
    const root = { dataset: {} as Record<string, string> } as unknown as HTMLElement;
    applyPreference(root, "dark");
    expect(root.dataset.theme).toBe("dark");
    applyPreference(root, "light");
    expect(root.dataset.theme).toBe("light");
    applyPreference(root, "system");
    expect(root.dataset.theme).toBeUndefined();
  });

  it("reads the key the switcher writes", () => {
    // These drifting apart is silent: the switch works for the rest of the
    // session and forgets everything on reload.
    expect(THEME_INIT_SCRIPT).toContain(`"${THEME_STORAGE_KEY}"`);
    expect(THEME_INIT_SCRIPT).toContain("dataset.theme");
    // And it may not throw where storage is blocked, which aborts the parse.
    expect(THEME_INIT_SCRIPT.startsWith("try{")).toBe(true);
    expect(THEME_INIT_SCRIPT).toContain("catch");
  });

  it("runs that script before the page is painted", () => {
    /*
     * This reads the *output*, not the layout, and that is the whole point.
     *
     * The first version of this assertion checked the source and passed while
     * the script reached no page at all: the App Router silently drops a
     * hand-written `<head>`, and `next/script` with `beforeInteractive` emitted
     * nothing from a `[locale]` root. Both looked correct in the file. Only
     * `curl` showed the truth, so the test now looks where `curl` looked.
     *
     * It needs `next build` to have run — which is why the CI job builds before
     * it tests. `prerendered()` fails loudly rather than skipping if it finds
     * nothing, because a check that quietly matches zero files is worse than no
     * check.
     */
    const pages = prerendered();
    expect(pages.length, "prerendered pages found under .next/server/app").toBeGreaterThan(20);

    const missing = pages.filter(({ html }) => !html.includes(THEME_STORAGE_KEY));
    expect(missing.map((p) => p.name), "pages the theme script never reached").toEqual([]);

    // And before anything it could repaint: the parser must hit it above the
    // page content, or the flash it exists to prevent still happens.
    const tooLate = pages.filter(({ html }) => {
      const script = html.indexOf(THEME_STORAGE_KEY);
      const body = html.indexOf("<body");
      const content = html.indexOf("<main");
      return !(body < script && (content === -1 || script < content));
    });
    expect(tooLate.map((p) => p.name), "pages where the script runs after content").toEqual([]);
  });

  it("paints the other tab, not just its menu", () => {
    /*
     * Two tabs open, the theme changed in one. The `storage` event fires in the
     * *other* tab, and re-reading the store there only moves the select — the
     * document keeps the old palette, because the tab that wrote `data-theme`
     * was the first one. The menu said "Dark" while the page stayed light.
     * (Found in review of #116; the comment in `theme.ts` had claimed this case
     * was handled.)
     */
    const root = { dataset: {} as Record<string, string> } as unknown as HTMLElement;
    expect(syncFromStorage(root, "dark")).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(syncFromStorage(root, null)).toBe("system");
    expect(root.dataset.theme).toBeUndefined();
  });

  it("wires that into the storage event, for our key only", () => {
    // The behaviour above is only worth anything if the listener calls it. This
    // drives the real subscription against stubbed globals rather than trusting
    // that the wiring looks right.
    const root = { dataset: {} as Record<string, string> } as unknown as HTMLElement;
    const handlers: ((event: StorageEvent) => void)[] = [];
    const globals = globalThis as unknown as Record<string, unknown>;
    const saved = { window: globals.window, document: globals.document, localStorage: globals.localStorage };
    let stored: string | null = "dark";

    globals.window = {
      addEventListener: (type: string, fn: (event: StorageEvent) => void) => { if (type === "storage") handlers.push(fn); },
      removeEventListener: () => {},
    };
    globals.document = { documentElement: root };
    globals.localStorage = { getItem: () => stored };

    try {
      let notified = 0;
      const unsubscribe = subscribeToPreference(() => { notified += 1; });
      expect(handlers.length, "a storage listener was registered").toBe(1);

      handlers[0]({ key: "straton-theme" } as StorageEvent);
      expect(root.dataset.theme, "the receiving tab repaints").toBe("dark");
      expect(notified).toBe(1);

      // Somebody else's key. Not ours to act on.
      root.dataset.theme = "dark";
      stored = "light";
      handlers[0]({ key: "some-other-product" } as StorageEvent);
      expect(root.dataset.theme, "an unrelated key is ignored").toBe("dark");
      expect(notified).toBe(1);

      // `localStorage.clear()` arrives with a null key, and does concern us.
      stored = null;
      handlers[0]({ key: null } as StorageEvent);
      expect(root.dataset.theme, "a cleared store falls back to the system").toBeUndefined();
      expect(notified).toBe(2);

      unsubscribe();
    } finally {
      globals.window = saved.window;
      globals.document = saved.document;
      globals.localStorage = saved.localStorage;
    }
  });

  it("puts the switcher on a screen somebody can reach", () => {
    // The assertion this file exists for. A component imported by nothing is
    // invisible to every other check in this repository.
    const mounted = readFileSync("src/components/app-shell/UserMenu.tsx", "utf8");
    expect(mounted).toContain("ThemeSwitcher");
    expect(mounted).toMatch(/<ThemeSwitcher\s*\/>/);
  });
});

describe("the stylesheet honours all three states", () => {
  it("lets an explicit choice override the system preference", () => {
    // Without the `:not(…)`, choosing dark on a machine set to light changes
    // nothing — the one combination of four that nobody sits in front of.
    expect(css).toContain('@media (prefers-color-scheme: light)');
    expect(css).toMatch(/@media \(prefers-color-scheme: light\) \{\s*:root:not\(\[data-theme="dark"\]\) \{/);
    expect(css).toContain(':root[data-theme="light"] {');
  });

  it("gives native widgets the chosen scheme, not the system one", () => {
    expect(blockAfter(':root[data-theme="dark"]')).toContain("color-scheme: dark");
    expect(blockAfter(':root[data-theme="light"]')).toContain("color-scheme: light");
  });

  it("keeps the two light palettes identical", () => {
    // They are the same declarations written twice, because a media query and
    // a plain selector cannot share a rule. A value fixed in one and forgotten
    // in the other shows up only for people in the state nobody tested.
    const viaPreference = declarations(blockAfter(':root:not([data-theme="dark"])'));
    const viaChoice = declarations(blockAfter(':root[data-theme="light"]'));

    // A parser that matched nothing would compare [] to [] and pass forever —
    // the failure this repository has already had once, in its own build
    // comparison.
    expect(viaPreference.length, "declarations in the media-query block").toBeGreaterThan(30);
    expect(viaChoice).toEqual(viaPreference);
  });
});

describe("the three states are named in every language", () => {
  const LOCALES = ["de", "en", "es", "fr", "it", "nl", "pl", "pt", "pt-BR", "ro"];
  const KEYS: (ThemePreference | "theme")[] = ["theme", "system", "light", "dark"];

  for (const locale of LOCALES) {
    it(`names them in ${locale}`, () => {
      const shell = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).appShell ?? {};
      const missing = KEYS.filter((key) => {
        const name = key === "theme" ? "theme" : `theme${key[0].toUpperCase()}${key.slice(1)}`;
        return typeof shell[name] !== "string" || shell[name].length === 0;
      });
      expect(missing, `untranslated theme labels in ${locale}.json`).toEqual([]);
    });
  }
});
