import { expect, test } from "@playwright/test";
import { admin, signIn } from "./helpers";
import { hashFeedToken } from "../src/features/assignments/feed-token";

/**
 * Subscribing to your own agenda, end to end (#49, passo 2).
 *
 * Four links that no other layer walks together: the button reaches the action,
 * the action stores a digest, the URL it hands back reaches an unauthenticated
 * route, and that route returns a calendar. The unit tests prove the file is
 * well-formed and the RLS tests prove who may read what — neither of them ever
 * fetches the URL, and a subscription that 404s is indistinguishable from one
 * that works until somebody's phone is silent for a week.
 *
 * Revocation is tested in the same run and on purpose. A revoke that reports
 * success and leaves the URL serving is the exact failure this project has
 * found five times in other shapes, and it is worse here: the whole reason the
 * link is safe to hand out is that it can be taken back.
 */
test.describe("agenda calendar feed", () => {
  test("the link is issued, serves a calendar, and stops when revoked", async ({ page, request }) => {
    const db = admin();
    let digest: string | null = null;

    try {
      await signIn(page);
      await page.goto("/en/dashboard/agenda");

      // Either label, because the same button regenerates when a feed is
      // already live — a previous run that died before its cleanup would
      // otherwise leave this test failing on the wrong thing.
      await page.getByRole("button", { name: /create subscription address|generate a new address/i }).click();

      const field = page.getByLabel(/subscription address/i);
      await expect(field).toBeVisible();
      const url = await field.inputValue();
      expect(url, "the subscription URL").toMatch(/\/api\/agenda\/[A-Za-z0-9_-]{43}\.ics$/);

      const token = url.split("/").pop()!.replace(/\.ics$/, "");
      digest = hashFeedToken(token);

      // The screen is not evidence. What matters is what landed: one live row,
      // holding the digest and not the token.
      const { data: stored } = await db
        .from("agenda_feeds")
        .select("id,revoked_at")
        .eq("token_digest", digest);
      expect(stored ?? [], "the feed row").toHaveLength(1);
      expect(stored![0].revoked_at).toBeNull();

      const { data: plaintext } = await db.from("agenda_feeds").select("id").eq("token_digest", token);
      expect(plaintext ?? [], "the token must never be stored in the clear").toHaveLength(0);

      // No cookies on this request — `request` is a separate context, which is
      // the point: a calendar client has no session, and if this only worked
      // because the browser was signed in, the feature would work in this test
      // and nowhere else.
      const served = await request.get(url);
      expect(served.status(), "the calendar must be served without a session").toBe(200);
      expect(served.headers()["content-type"]).toContain("text/calendar");
      const body = await served.text();
      expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true);
      expect(body.trimEnd().endsWith("END:VCALENDAR")).toBe(true);

      await page.reload();
      await page.getByRole("button", { name: /^revoke$/i }).click();
      await page.getByRole("button", { name: /confirm revocation/i }).click();

      // Against the database first, because the message is allowed to say
      // anything at all.
      await expect(async () => {
        const { data } = await db.from("agenda_feeds").select("revoked_at").eq("token_digest", digest!);
        expect(data?.[0]?.revoked_at, "the row must be marked revoked").not.toBeNull();
      }).toPass({ timeout: 10_000 });

      const afterRevoke = await request.get(url);
      expect(afterRevoke.status(), "a revoked URL must stop serving").toBe(404);
    } finally {
      // Revoked rather than deleted: there is no delete grant on this table by
      // design, and a revoked row is the record that the URL once existed.
      if (digest) {
        await db.from("agenda_feeds").update({ revoked_at: new Date().toISOString() }).eq("token_digest", digest);
      }
    }
  });
});
