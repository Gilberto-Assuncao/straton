import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

/**
 * The web manifest, and the three ways it fails silently.
 *
 * A manifest that is wrong does not produce an error anywhere. The phone reads
 * it, decides the page is not installable, and quietly makes a bookmark
 * instead — which looks exactly like success until somebody opens it and finds
 * an address bar. The three failures below have all happened to somebody:
 * an icon path that points at no file, a colour that drifted away from the
 * palette it was copied from, and a middleware that rewrote the manifest URL
 * into a 404.
 */
const m = manifest();

/** Width and height out of a PNG's IHDR, which is at a fixed offset. */
function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  const signature = bytes.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error(`${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("the web manifest", () => {
  it("carries what a phone needs to offer an install", () => {
    // Not a style preference: without `name`, `icons` and `display`, Chrome
    // declines to install and says nothing about why.
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.icons?.length ?? 0).toBeGreaterThan(0);
  });

  it("keeps the home-screen label short enough to survive", () => {
    // Android truncates around twelve characters. A label that arrives as
    // "STRATON — C…" is a name nobody recognises on a crowded home screen.
    expect((m.short_name ?? "").length).toBeLessThanOrEqual(12);
  });

  it("opens the clock, not the marketing page", () => {
    // The whole reason this exists. Somebody who installs this installs it to
    // press one button; opening onto the landing page turns an app into a
    // bookmark with extra steps.
    expect(m.start_url).toBe("/ponto");
  });

  it("points at icons that exist, at the sizes it claims", () => {
    // A manifest is a promise about files it does not contain. Rename one and
    // nothing here fails, nothing in the build fails, and the install prompt
    // simply stops appearing.
    const icons = m.icons ?? [];
    expect(icons.length, "icons declared").toBeGreaterThan(1);
    for (const icon of icons) {
      const path = `public${icon.src}`;
      expect(existsSync(path), `${icon.src} is declared but not in public/`).toBe(true);
      const [declared] = (icon.sizes ?? "").split(" ");
      const [width, height] = declared.split("x").map(Number);
      expect(pngSize(path)).toEqual({ width, height });
    }
    // 192 and 512 are the two Android actually asks for.
    const declared = icons.map((icon) => icon.sizes);
    expect(declared).toContain("192x192");
    expect(declared).toContain("512x512");
  });

  it("ships an apple-touch icon, which iOS reads instead of the manifest", () => {
    // Safari ignores manifest icons for the home screen. Without this file iOS
    // uses a screenshot of the page, which is unreadable at that size.
    expect(existsSync("app/apple-icon.png")).toBe(true);
    expect(pngSize("app/apple-icon.png")).toEqual({ width: 180, height: 180 });
  });

  it("uses the palette's own canvas colour, and keeps using it", () => {
    // The copy that drifts. The manifest cannot read a CSS variable, so the
    // value is duplicated — and a duplicated colour is one theme change away
    // from a splash screen in the old palette that nobody thinks to look at.
    const css = readFileSync("app/globals.css", "utf8");
    const canvas = css.match(/--canvas:\s*(#[0-9a-fA-F]{6})/);
    expect(canvas, "--canvas not found in globals.css").not.toBeNull();
    expect(m.background_color).toBe(canvas![1].toLowerCase());
    expect(m.theme_color).toBe(canvas![1].toLowerCase());
  });

  it("is not rewritten into a locale that has no manifest", () => {
    // The failure that costs the whole feature. `/manifest.webmanifest` lives
    // outside `app/[locale]`, so the i18n middleware would prefix it to
    // `/en/manifest.webmanifest` — a 404, an install that never offers itself,
    // and no error anywhere. Checked in the source because the alternative is
    // checking it in production.
    const proxy = readFileSync("proxy.ts", "utf8");
    expect(proxy).toContain("/manifest.webmanifest");
    expect(proxy).toMatch(/ROOT_METADATA\.has\(request\.nextUrl\.pathname\)/);
  });
});
