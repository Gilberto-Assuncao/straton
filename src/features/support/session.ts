/**
 * When a support session may be used (#19).
 *
 * Its own module, with no database and no `server-only`, because this is the
 * check that decides whether one company's data is shown to somebody who is not
 * in it. That deserves to be tested against a clock rather than reasoned about.
 *
 * Three ways a session is not usable, and all three have to be checked on every
 * request rather than at the start: it was closed, it ran out, or it is for a
 * different company than the URL is asking for. The last one is the one an
 * attacker would try — a valid session for company A, and `/dashboard/support/B`
 * typed into the address bar.
 */
export interface SupportSessionRow {
  id: string;
  admin_user_id: string;
  company_id: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
}

export type SupportSessionRefusal = "ended" | "expired" | "otherCompany";

/** How long a session lasts. Long enough for a phone call. */
export const SUPPORT_SESSION_MINUTES = 30;

export function supportSessionExpiry(startedAt: Date): string {
  return new Date(startedAt.getTime() + SUPPORT_SESSION_MINUTES * 60_000).toISOString();
}

/**
 * Null when the session may be used for this company, or the reason it may not.
 *
 * Returning the reason rather than a boolean is not decoration: "expired" is
 * something to tell the person on screen so they open another one, and
 * "otherCompany" is something to log.
 */
export function refuseSupportSession(
  session: SupportSessionRow,
  companyId: string,
  now: Date,
): SupportSessionRefusal | null {
  if (session.ended_at !== null) return "ended";
  // `<=` and not `<`: a session whose expiry is exactly now has run out. The
  // boundary matters because it is the one a test will land on.
  if (new Date(session.expires_at).getTime() <= now.getTime()) return "expired";
  if (session.company_id !== companyId) return "otherCompany";
  return null;
}
