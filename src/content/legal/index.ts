import { en } from "./en";
import { fr } from "./fr";
import { nl } from "./nl";
import { AUTHORED_LOCALES, type AuthoredLocale, type LegalDocument, type LegalKind, type LegalPack } from "./types";

export { LEGAL, LEGAL_KINDS, AUTHORED_LOCALES } from "./types";
export type { LegalDocument, LegalKind, LegalSection, AuthoredLocale } from "./types";

const PACKS: Record<AuthoredLocale, LegalPack> = { en, nl, fr };

/** The version served when the reader's language has none of its own. */
const REFERENCE: AuthoredLocale = "en";

export interface LegalResolution {
  document: LegalDocument;
  /** The language the reader is actually getting. */
  language: AuthoredLocale;
  /** True when this is not the reader's own language. */
  isFallback: boolean;
}

/**
 * The document for a reader, and an honest answer about which language it is in.
 *
 * The platform speaks ten languages; these documents are written in three. That
 * gap is deliberate — see the note in `types.ts` — but it must be visible: a
 * Polish reader shown English text with no explanation is entitled to think the
 * page is broken. So the fallback is returned as a fact the page has to render,
 * not hidden behind a silent default.
 */
export function resolveLegalDocument(kind: LegalKind, locale: string): LegalResolution {
  const authored = (AUTHORED_LOCALES as readonly string[]).includes(locale)
    ? (locale as AuthoredLocale)
    : null;
  const language = authored ?? REFERENCE;
  return { document: PACKS[language][kind], language, isFallback: authored === null };
}
