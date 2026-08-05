import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { hashToken, inviteUrl, mintInviteToken, INVITE_TTL_DAYS } from "@/src/features/partners/invite-token";

/**
 * The invitation token is a credential: whoever holds it can create a company
 * linked to yours. These tests guard the two properties that makes acceptable
 * — it is unguessable, and the database never sees it.
 */
describe("invitation tokens", () => {
  it("never repeats", () => {
    const seen = new Set(Array.from({ length: 500 }, () => mintInviteToken().token));
    expect(seen.size).toBe(500);
  });

  it("carries enough entropy to be unguessable", () => {
    // 32 random bytes; base64url turns that into 43 characters. A shorter
    // token here would mean a token someone can sit and try.
    const { token } = mintInviteToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("is URL-safe, so nothing mangles it in transit", () => {
    // It travels through an email client, a URL, and whatever a messaging app
    // does to links. A '+' or '/' surviving that is not something to rely on.
    for (let index = 0; index < 200; index += 1) {
      expect(mintInviteToken().token).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });

  it("stores a digest, never the token itself", () => {
    const { token, digest } = mintInviteToken();
    expect(digest).not.toContain(token);
    expect(digest).toBe(createHash("sha256").update(token).digest("hex"));
    expect(digest).toHaveLength(64);
  });

  it("produces a lowercase hex digest", () => {
    // Shape only. Whether it matches what Postgres computes is a question this
    // file cannot answer — that cross-check lives in tests/rls, against a real
    // database, because agreeing with itself proves nothing.
    expect(hashToken("a-known-token")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds a link without doubling the slash", () => {
    const { token } = mintInviteToken();
    expect(inviteUrl("https://straton.be/", token)).toBe(
      `https://straton.be/accept-company-invite?token=${encodeURIComponent(token)}`,
    );
    expect(inviteUrl("https://straton.be", token)).toContain("straton.be/accept-company-invite?token=");
  });

  it("escapes the token into the query string", () => {
    // base64url happens not to need escaping today. Relying on that would make
    // a future change of alphabet produce quietly broken links.
    expect(inviteUrl("https://straton.be", "a+b/c=")).toContain("token=a%2Bb%2Fc%3D");
  });

  it("stays valid long enough to survive a holiday", () => {
    expect(INVITE_TTL_DAYS).toBeGreaterThanOrEqual(14);
  });
});
