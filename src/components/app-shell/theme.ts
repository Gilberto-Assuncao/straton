/**
 * The three states a person can be in, and how the page learns which (#82).
 *
 * `system` is the absence of a choice, not a third value written down: it is
 * stored as nothing and leaves the root element without `data-theme`, so
 * `@media (prefers-color-scheme: light)` in `globals.css` is what decides. The
 * two explicit states set the attribute, and the `[data-theme]` rules there
 * override the media query in both directions.
 */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "straton-theme";

/** Anything else in storage — a stale value, a typo, another tab's key. */
export function readPreference(raw: string | null): ThemePreference {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/** Sets or clears the attribute the stylesheet reads. */
export function applyPreference(root: HTMLElement, preference: ThemePreference): void {
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
}

/**
 * The script that runs before the first paint.
 *
 * Three placements were tried and only the third survives contact with the
 * served HTML, which is the only judge that counts here:
 *
 *   - A hand-written `<head>` in the layout. The App Router drops it silently.
 *     `curl` showed no script at all; nothing in the build said so.
 *   - `next/script` with `strategy="beforeInteractive"`. The documentation says
 *     it is injected into the initial HTML, and from a `[locale]` root it
 *     emitted nothing. It is also the wrong tool by its own description —
 *     "does not block page hydration from occurring" is about fetch order, and
 *     what this needs is to block the parser.
 *   - A plain inline `<script>` as the first child of `<body>`. It appears in
 *     the markup above the page content and executes there, which is early
 *     enough: nothing below it has painted yet.
 *
 * A theme applied after paint is the flash this exists to prevent — the page
 * arrives dark and jumps to light, once per navigation, for everybody who
 * chose light.
 *
 * `try` because `localStorage` throws outright when storage is blocked, and an
 * exception here would abort the parse of the element. Failing to read a
 * preference has to degrade to the system default, not to a blank page.
 *
 * Kept as a string so `tests/unit/theme-switch.test.ts` can assert the key it
 * reads is the key the switcher writes. Those two drifting apart is silent:
 * the switch works for the rest of the session and forgets everything on
 * reload.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/**
 * The stored preference as an external store, which is what it is.
 *
 * Reading it in an effect and calling `setState` is the obvious shape and the
 * React Compiler rejects it — correctly: this is state that lives outside
 * React, in `localStorage`, and `useSyncExternalStore` is the API for that.
 * Subscribing also reaches the case nobody thinks to build: two tabs open and
 * the theme changed in one. The `storage` event covers the other tabs; the
 * local set has to notify by hand, because a tab does not receive its own.
 * Note what the event does *not* do on its own — see `onStorage` below.
 */
const listeners = new Set<() => void>();

/**
 * Puts a stored value on screen: the attribute *and* the returned preference.
 *
 * Separate from the subscription so it can be tested without a browser, and
 * because the two-tab case needs exactly this and nothing else.
 */
export function syncFromStorage(root: HTMLElement, raw: string | null): ThemePreference {
  const preference = readPreference(raw);
  applyPreference(root, preference);
  return preference;
}

export function subscribeToPreference(onChange: () => void): () => void {
  listeners.add(onChange);

  /*
   * The other tab's `storePreference` set `data-theme` on *its* document, not
   * this one. Re-reading the store only moves the select — found in review of
   * #116, where the comment above promised this case was handled and only half
   * of it was: the menu said "Dark" while the page stayed light until reload.
   *
   * A null key is `localStorage.clear()`, which concerns us too.
   */
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    try {
      syncFromStorage(document.documentElement, localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      // Storage blocked. Nothing to sync to.
    }
    onChange();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** A plain string, so referential stability is free. */
export function getPreference(): ThemePreference {
  try {
    return readPreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** What the server renders, before any storage exists to read. */
export function getServerPreference(): ThemePreference {
  return "system";
}

export function storePreference(preference: ThemePreference): void {
  applyPreference(document.documentElement, preference);
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Blocked storage costs persistence across reloads, not the change itself.
  }
  for (const listener of listeners) listener();
}
