import { createHash, randomBytes } from "node:crypto";

/**
 * Invitation tokens, kept in their own module free of `server-only` so they can
 * be unit tested — and cross-checked against Postgres in tests/rls, which is
 * the only place the two hashing implementations can be shown to agree.
 *
 * A live token lets a stranger create a company linked to yours. It is a
 * credential, and it is handled like one.
 */

/** How long an invitation stays good for. Long enough to survive a holiday. */
export const INVITE_TTL_DAYS = 21;

/**
 * A fresh token, and the digest that is all the database ever sees.
 *
 * 32 random bytes, base64url so it survives an email client, a URL, and
 * whatever a messaging app does to links. Storing only the digest means a copy
 * of the table is a list of spent guesses rather than a set of working
 * invitations — the same reason a password table holds hashes.
 */
export function mintInviteToken(): { token: string; digest: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, digest: hashToken(token) };
}

/** Must agree exactly with `encode(sha256(token::bytea), 'hex')` in Postgres. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, "")}/accept-company-invite?token=${encodeURIComponent(token)}`;
}
