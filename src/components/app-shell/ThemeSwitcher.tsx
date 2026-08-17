"use client";
import { useTranslations } from "next-intl";
export type ThemePreference="dark"|"light"|"system";
export function ThemeSwitcher({ value="system", onChange }: { value?:ThemePreference; onChange?:(theme:ThemePreference)=>void }) {
  const tShell = useTranslations("appShell");
  return <div><label htmlFor="theme-switcher" className="sr-only">{tShell("theme")}</label><select id="theme-switcher" value={value} onChange={event=>onChange?.(event.target.value as ThemePreference)} className="min-h-11 rounded-lg border border-edge-10 bg-surface-alt px-3 text-sm text-ink outline-none focus:border-brand">{(["dark","light","system"] as const).map(theme=><option key={theme} value={theme}>{tShell(theme==="dark"?"themeDark":theme==="light"?"themeLight":"themeSystem")}</option>)}</select></div>; }
