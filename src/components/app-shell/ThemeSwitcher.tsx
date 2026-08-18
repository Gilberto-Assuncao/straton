"use client";
import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import {
  getPreference,
  getServerPreference,
  storePreference,
  subscribeToPreference,
  type ThemePreference,
} from "./theme";

export type { ThemePreference };

/**
 * Three states, because two cannot express "follow the browser" (#82).
 *
 * A checkbox has no way back to the system preference once it has been
 * touched, so somebody who tries the switch out is stuck with a choice they
 * did not want to make. `system` is the default and stays selectable.
 *
 * The server renders `system` and the client corrects it after mount, which is
 * a hydration requirement rather than a compromise: there is no `localStorage`
 * on the server to read. The *page* does not flash — the inline script in the
 * layout has already set `data-theme` before the first paint — only this one
 * select settles, and it is inside a closed menu while it does.
 */
export function ThemeSwitcher() {
  const tShell = useTranslations("appShell");
  const preference = useSyncExternalStore(subscribeToPreference, getPreference, getServerPreference);

  return (
    <div>
      <label htmlFor="theme-switcher" className="sr-only">{tShell("theme")}</label>
      <select
        id="theme-switcher"
        value={preference}
        onChange={(event) => storePreference(event.target.value as ThemePreference)}
        className="min-h-11 w-full rounded-lg border border-edge-10 bg-surface-alt px-3 text-sm text-ink outline-none focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        <option value="system">{tShell("themeSystem")}</option>
        <option value="light">{tShell("themeLight")}</option>
        <option value="dark">{tShell("themeDark")}</option>
      </select>
    </div>
  );
}
