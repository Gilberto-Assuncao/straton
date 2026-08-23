/**
 * The user manual, in the app (#46).
 *
 * The issue's own sequence puts in-app help before a PDF, for a reason worth
 * repeating: somebody standing on a roof does not open a manual. They read the
 * sentence next to the field. What is written here is the layer above that —
 * the rules that no field label can hold, and that generate support calls
 * precisely because they are deliberate and look like defects.
 *
 * Same content-not-messages decision as the legal pages, and mostly the same
 * reason: `locale-parity.test.ts` would be satisfied by a machine translation
 * of a guide into ten languages nobody qualified has read, and a guide that
 * confidently says the wrong thing costs more than one that is missing.
 *
 * The authored set is wider here than for the legal pages, because a guide is
 * not a contract: an awkward sentence is a nuisance rather than a liability.
 */
export const HELP_GUIDES = ["worker", "supervisor", "manager", "partner"] as const;
export type HelpGuideId = (typeof HELP_GUIDES)[number];

export interface HelpSection {
  heading: string;
  /** Paragraphs. One string per paragraph; no markup. */
  body: string[];
}

export interface HelpGuide {
  title: string;
  /** Who this one is for, in one line, so nobody reads the wrong guide. */
  audience: string;
  sections: HelpSection[];
}

export type HelpPack = Record<HelpGuideId, HelpGuide>;

/** The languages the guides were actually written in. */
export const AUTHORED_HELP_LOCALES = ["en", "nl", "fr", "pt"] as const;
export type AuthoredHelpLocale = (typeof AUTHORED_HELP_LOCALES)[number];

/**
 * Where a locale without its own guides is sent.
 *
 * `pt-BR` goes to `pt` rather than to English, which is the whole reason this
 * is a map and not a constant: a Brazilian reader given European Portuguese
 * understands every word, and given English may not.
 *
 * The rest fall back to English, and the seven languages that do are worth
 * naming out loud: German, Spanish, Italian, Polish and Romanian readers get a
 * guide they can probably follow, and Polish and Romanian speakers are a large
 * share of the workforce this product is for. Translating the worker guide into
 * those two is the first thing worth paying somebody for.
 */
export const HELP_FALLBACK: Record<string, AuthoredHelpLocale> = { "pt-BR": "pt" };
export const HELP_REFERENCE: AuthoredHelpLocale = "en";
