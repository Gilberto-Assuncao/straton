import { defineRouting } from "next-intl/routing";

// English, Portuguese, French, Dutch, German were already offered by the
// (previously non-functional) LanguageSwitcher. Polish and Romanian added per
// the "Multi-language — Eastern European languages in scope" roadmap item.
// Spanish (Spain) and Italian added 2026-07-22.
//
// Both Portugueses, added 2026-08-09. `pt` is European Portuguese, which the
// Belgian Portuguese-speaking workforce reads; `pt-BR` is Brazilian. They are
// not interchangeable on the screens that matter here — a Brazilian reads
// "estaleiro" and "palavra-passe" as a foreign dialect, and the whole point of
// translating a clock-in screen is that the person using it is not translating
// in their head.
export const locales = ["en", "pt", "pt-BR", "fr", "nl", "de", "pl", "ro", "es", "it"] as const;
export type Locale = (typeof locales)[number];

/**
 * What each language calls itself.
 *
 * The one place the list lives. The company settings form and its validator
 * each kept their own copy, and both had drifted — they still offered five
 * languages while the interface shipped nine, so a Polish crew could read the
 * app but their company could not be set to Polish.
 */
export const localeLabels: Record<Locale, string> = {
  en: "English",
  pt: "Português (Portugal)",
  "pt-BR": "Português (Brasil)",
  fr: "Français",
  nl: "Nederlands",
  de: "Deutsch",
  pl: "Polski",
  ro: "Română",
  es: "Español",
  it: "Italiano",
};

/** Case-insensitive, because form input arrives lowercased and `pt-BR` is not. */
export function normaliseLocale(input: string): Locale | null {
  return locales.find((locale) => locale.toLowerCase() === input.toLowerCase()) ?? null;
}

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
});
