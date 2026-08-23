import type { MetadataRoute } from "next";

/**
 * What makes `/ponto` behave like an app on a phone.
 *
 * The clock-in page was built for this: no sidebar, no switcher, one button,
 * deliberately outside the dashboard layout. What it never had was a manifest,
 * so saving it to a home screen produced a browser tab with an address bar over
 * it — three quarters of the screen for the button and a quarter for a URL that
 * nobody standing on a roof in the rain needs to read.
 *
 * `start_url` is the clock, not the landing page. Somebody who installs this
 * installs it to press one button; opening onto the marketing site and asking
 * them to navigate is how an installed app becomes a bookmark nobody uses.
 *
 * Not localised, and it cannot be: a manifest is one file for the whole origin,
 * fetched without a locale in scope. `/ponto` resolves through the same
 * `as-needed` prefixing as any other path, so the app opens in the default
 * language and the switcher is one tap away. A per-locale manifest would need a
 * per-locale start_url, which is a different feature.
 */

/**
 * Must agree with `--canvas` in `app/globals.css`.
 *
 * A manifest cannot read a CSS variable — the browser paints the splash screen
 * and the status bar from this value before a single stylesheet loads. So it is
 * copied, and `tests/unit/manifest.test.ts` fails if the copy drifts from the
 * palette. The dark value is the right one to copy: the splash appears before
 * the page can tell which theme the reader prefers, and the product's own
 * ground is dark.
 */
const CANVAS = "#0b1220";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // English, like `start_url`: one manifest serves the whole origin and it is
    // fetched with no locale in scope, so it says what the page it opens says.
    name: "STRATON — Clock in",
    // Seven characters. Android truncates a home-screen label at about twelve,
    // and "STRATON — C…" is not a name. This one is also the same word in all
    // ten languages, which the rest of the manifest cannot be.
    short_name: "STRATON",
    description: "Clocking in and out for field teams.",
    start_url: "/ponto",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: CANVAS,
    theme_color: CANVAS,
    categories: ["business", "productivity"],
    icons: [
      // No `maskable`. Android crops a maskable icon to its own shape, and this
      // mark is drawn to the edge of its rounded square — declaring it maskable
      // would cut the corners off the cube. It comes back when there is a
      // padded version of the mark to declare.
      { src: "/icons/straton-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/straton-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
