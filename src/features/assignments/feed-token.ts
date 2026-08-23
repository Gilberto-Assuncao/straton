import { createHash, randomBytes } from "node:crypto";

/**
 * Calendar subscription tokens (#49, passo 2).
 *
 * Kept in their own module free of `server-only` so they can be unit tested,
 * and so the hashing can be cross-checked against Postgres in tests/rls — the
 * only place the two implementations can be shown to agree. Same shape as
 * `partners/invite-token.ts`, for the same reason: a live token is a
 * credential, and a calendar client has no session to present alongside it.
 */

/**
 * A fresh token, and the digest that is all the database ever sees.
 *
 * 32 random bytes, base64url so it survives being pasted into a calendar app,
 * a QR code and whatever a messaging app does to links. Storing only the digest
 * means a copy of the table is a list of spent guesses rather than a set of
 * working subscriptions.
 */
export function mintFeedToken(): { token: string; digest: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, digest: hashFeedToken(token) };
}

/** Must agree exactly with `encode(sha256(token::bytea), 'hex')` in Postgres. */
export function hashFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The subscription URL.
 *
 * Ends in `.ics` because several calendar clients decide how to treat a URL by
 * its extension before they ever look at the Content-Type — Outlook's web
 * subscription being the one that matters here.
 */
export function agendaFeedUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/agenda/${encodeURIComponent(token)}.ics`;
}
