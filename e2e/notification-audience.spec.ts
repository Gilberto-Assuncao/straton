import { expect, test } from "@playwright/test";
import { admin, BELNEX_COMPANY_ID, signIn, uniqueName } from "./helpers";

/**
 * Choosing who hears about a work location (#83).
 *
 * The screen this covers has the shape the e2e suite exists for: a list whose
 * rows are written by a server action and read back through a policy. Both
 * halves can fail silently — the insert refused by RLS with a green toast, the
 * delete filtered to zero rows and reported as done — and neither the type
 * checker nor the RLS suite would notice, because the first only sees types
 * and the second never presses anything.
 */
test.describe("who hears about a location", () => {
  test("somebody added is really on the list, and really comes off it", async ({ page }) => {
    const db = admin();
    const siteName = uniqueName("Chantier audience");

    const { data: created, error } = await db
      .from("sites")
      .insert({ company_id: BELNEX_COMPANY_ID, name: siteName })
      .select("id")
      .single();
    expect(error, "the fixture location").toBeNull();
    const siteId = created!.id as string;

    try {
      await signIn(page);
      await page.goto(`/en/dashboard/sites/${siteId}?tab=notifications`);

      // The first colleague the picker offers. Chosen from the page rather
      // than hardcoded, so this does not break when the demo seed changes who
      // works at Belnex.
      const picker = page.locator("#audience-person");
      await expect(picker).toBeVisible();
      const userId = await picker.locator("option").nth(1).getAttribute("value");
      expect(userId, "a colleague to add").toBeTruthy();

      await picker.selectOption(userId!);
      await page.getByRole("button", { name: /^add$/i }).click();

      await expect(async () => {
        const { data } = await db
          .from("site_notification_subscribers")
          .select("id,site_area_id")
          .eq("site_id", siteId)
          .eq("user_id", userId!)
          .maybeSingle();
        expect(data, "the subscriber the screen said it added").not.toBeNull();
        // Left on "the whole location", which is the default the form opens on
        // — narrowing to a sector is the special case, not the normal one.
        expect(data!.site_area_id, "scope, left at the whole location").toBeNull();
      }).toPass({ timeout: 20_000 });

      const { data: row } = await db
        .from("site_notification_subscribers")
        .select("id")
        .eq("site_id", siteId)
        .eq("user_id", userId!)
        .single();

      await page.locator(`[data-subscriber-id="${row!.id}"]`).getByRole("button", { name: /^remove$/i }).click();

      // The half that fails silently. A delete with no policy behind it removes
      // nothing, raises nothing, and the row stays on the list while the screen
      // says it is gone — and somebody keeps being notified about a chantier
      // they were taken off.
      await expect(async () => {
        const { data } = await db
          .from("site_notification_subscribers")
          .select("id")
          .eq("id", row!.id)
          .maybeSingle();
        expect(data, "the subscriber the screen said it removed").toBeNull();
      }).toPass({ timeout: 20_000 });
    } finally {
      await db.from("sites").delete().eq("id", siteId);
    }
  });
});
