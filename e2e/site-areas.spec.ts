import { expect, test } from "@playwright/test";
import { admin, BELNEX_COMPANY_ID, signIn, uniqueName } from "./helpers";

/**
 * Subdivisions of a work location, added and removed through the screen (#77).
 *
 * Chosen over something with more on it because of what has actually gone wrong
 * here. A delete with a policy and no grant affects nothing, raises nothing, and
 * still shows a success message — this project has found the missing half of a
 * delete five times, and the last one made deleting a work location impossible
 * in every environment for as long as the feature had existed (202608100007).
 *
 * The RLS suite already proves the database allows it. What it cannot prove is
 * that the button is wired to the action, the action to the database, and the
 * page to what came back. That is four links, and only a browser walks them.
 */
test.describe("subdivisions", () => {
  test("added and removed, and the row really goes", async ({ page }) => {
    const db = admin();
    const siteName = uniqueName("Chantier areas");
    const areaName = uniqueName("1er etage");

    // Setup, not the subject: the location is created straight in the database
    // so a failure here is unambiguous. Creating one through the form is
    // already covered by `work-location.spec.ts`.
    const { data: created, error } = await db
      .from("sites")
      .insert({ company_id: BELNEX_COMPANY_ID, name: siteName })
      .select("id")
      .single();
    expect(error, "the fixture location").toBeNull();
    const siteId = created!.id as string;

    try {
      await signIn(page);
      await page.goto(`/en/dashboard/sites/${siteId}?tab=areas`);

      // Every location is created with one subdivision by a trigger, so the
      // list is never empty and the guard below has something to protect.
      const { data: seeded } = await db.from("site_areas").select("id").eq("site_id", siteId);
      expect(seeded ?? [], "the subdivision the trigger creates").toHaveLength(1);

      await page.locator("#area-name").fill(areaName);
      await page.getByRole("button", { name: /^add$/i }).click();

      // The screen is allowed to say whatever it likes. This is the assertion.
      await expect(async () => {
        const { data } = await db
          .from("site_areas")
          .select("id")
          .eq("site_id", siteId)
          .eq("name", areaName)
          .maybeSingle();
        expect(data, "the subdivision the form said it added").not.toBeNull();
      }).toPass({ timeout: 20_000 });

      const { data: area } = await db
        .from("site_areas")
        .select("id")
        .eq("site_id", siteId)
        .eq("name", areaName)
        .single();
      const areaId = area!.id as string;

      // Scoped to the row, because both rows carry the same three buttons and
      // the other one is the default — which is displayed under a translated
      // label that is not its stored name.
      await page.locator(`[data-area-id="${areaId}"]`).getByRole("button", { name: /^delete$/i }).click();

      // The whole point of the file. A delete that reports success and removes
      // nothing passes every check this project had before this test existed.
      await expect(async () => {
        const { data } = await db.from("site_areas").select("id").eq("id", areaId).maybeSingle();
        expect(data, "the subdivision the screen said it deleted").toBeNull();
      }).toPass({ timeout: 20_000 });
    } finally {
      // In `finally` so a failed assertion above does not leave a location
      // behind to confuse the next run. Deleting the location takes its
      // subdivisions with it by cascade.
      await db.from("sites").delete().eq("id", siteId);
    }
  });

  /**
   * The guard from 202608100005, seen from the screen.
   *
   * The database refuses to leave a location with no subdivisions. The page is
   * supposed to say so rather than offer a button that fails — a greyed-out
   * control whose only explanation lives in a tooltip was reported as broken
   * here once already, and tooltips do not exist on a phone.
   */
  test("the last one cannot be removed, and the page says why", async ({ page }) => {
    const db = admin();
    const siteName = uniqueName("Chantier lone");

    const { data: created, error } = await db
      .from("sites")
      .insert({ company_id: BELNEX_COMPANY_ID, name: siteName })
      .select("id")
      .single();
    expect(error, "the fixture location").toBeNull();
    const siteId = created!.id as string;

    try {
      await signIn(page);
      await page.goto(`/en/dashboard/sites/${siteId}?tab=areas`);

      const { data: areas } = await db.from("site_areas").select("id").eq("site_id", siteId);
      expect(areas ?? [], "one subdivision, so this is the last one").toHaveLength(1);

      const onlyRow = page.locator(`[data-area-id="${areas![0].id}"]`);
      await expect(onlyRow.getByRole("button", { name: /^delete$/i })).toBeDisabled();
      await expect(page.getByText(/keeps at least one subdivision/i)).toBeVisible();
    } finally {
      await db.from("sites").delete().eq("id", siteId);
    }
  });
});
