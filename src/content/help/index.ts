import { en } from "./en";
import { fr } from "./fr";
import { nl } from "./nl";
import { pt } from "./pt";
import {
  AUTHORED_HELP_LOCALES,
  HELP_FALLBACK,
  HELP_REFERENCE,
  type AuthoredHelpLocale,
  type HelpGuide,
  type HelpGuideId,
  type HelpPack,
} from "./types";

export { HELP_GUIDES, AUTHORED_HELP_LOCALES } from "./types";
export type { HelpGuide, HelpGuideId, HelpSection, AuthoredHelpLocale } from "./types";

const PACKS: Record<AuthoredHelpLocale, HelpPack> = { en, nl, fr, pt };

export interface HelpResolution {
  guide: HelpGuide;
  language: AuthoredHelpLocale;
  /** True when this is not the reader's own language. */
  isFallback: boolean;
}

/**
 * The guide for a reader, and an honest answer about which language it is in.
 *
 * The fallback is returned as a fact the page has to render rather than hidden
 * behind a silent default — a Polish reader shown English with no explanation
 * is entitled to think the page is broken.
 */
export function resolveHelpGuide(id: HelpGuideId, locale: string): HelpResolution {
  if ((AUTHORED_HELP_LOCALES as readonly string[]).includes(locale)) {
    const language = locale as AuthoredHelpLocale;
    return { guide: PACKS[language][id], language, isFallback: false };
  }
  const language = HELP_FALLBACK[locale] ?? HELP_REFERENCE;
  return { guide: PACKS[language][id], language, isFallback: true };
}

/**
 * Which guide to put first.
 *
 * Not a filter — anybody may read any of them, and a supervisor who wants to
 * know what their crew sees should be able to. But four guides on a page is
 * three chances to open the wrong one, so the reader's own role leads.
 */
export function guideOrderFor(roles: string[]): HelpGuideId[] {
  const isAdmin = roles.some((role) => ["owner", "admin", "administrator"].includes(role));
  const isSupervisor = roles.some((role) => ["manager", "supervisor"].includes(role));
  if (isAdmin) return ["manager", "supervisor", "worker", "partner"];
  if (isSupervisor) return ["supervisor", "worker", "manager", "partner"];
  return ["worker", "supervisor", "manager", "partner"];
}
