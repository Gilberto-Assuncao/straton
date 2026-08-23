/**
 * The legal pages, as content rather than as message keys (#—, from the
 * readiness review).
 *
 * They are not in `messages/*.json` for one reason: `locale-parity.test.ts`
 * demands that every key present in English exists, filled in, in the other
 * nine. That rule is right for an interface — a button with no label is a bug —
 * and wrong for a contract, because it would be satisfied by a machine
 * translation of a privacy notice into nine languages nobody qualified has
 * read. A wrong sentence in a legal document is worse than an honest absence.
 *
 * So the documents live here, in the languages they were actually written in,
 * and every other locale is served the reference version with a notice saying
 * so — see `index.ts`.
 */
export const LEGAL_KINDS = ["privacy", "terms", "security"] as const;
export type LegalKind = (typeof LEGAL_KINDS)[number];

export interface LegalSection {
  heading: string;
  /** Paragraphs. One string per paragraph; no markup. */
  body: string[];
}

export interface LegalDocument {
  title: string;
  /** One sentence under the title, saying what the document is for. */
  summary: string;
  sections: LegalSection[];
}

export type LegalPack = Record<LegalKind, LegalDocument>;

/**
 * Who is behind STRATON, in one place.
 *
 * **This must be confirmed before the pages are published.** A privacy notice
 * has to name the controller, and naming the wrong entity is a factual error on
 * the one kind of page where a factual error matters most. The registered
 * address and the enterprise number belong here too, and are absent because
 * nobody has supplied them yet — the pages omit what is missing rather than
 * inventing it.
 */
export const LEGAL = {
  operator: "BELNEX Energy",
  /** The same address the landing page already publishes for contact. */
  contactEmail: "contact@belnexenergy.be",
  /**
   * The date shown on every document, as YYYY-MM-DD.
   *
   * Changed by hand, when the text changes. Not `new Date()`: a notice that
   * claims to have been updated today, every day, tells the reader nothing and
   * is the sort of detail a regulator reads as carelessness.
   */
  updatedAt: "2026-08-23",
} as const;

/** The languages the documents were written in. Everything else falls back. */
export const AUTHORED_LOCALES = ["en", "nl", "fr"] as const;
export type AuthoredLocale = (typeof AUTHORED_LOCALES)[number];
