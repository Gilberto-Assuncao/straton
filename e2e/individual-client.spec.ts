import { expect, test } from "@playwright/test";
import { admin, signIn, uniqueName } from "./helpers";

/**
 * A client who is a person, created from the site form (#85).
 *
 * The model could not hold this until now: `sites.client_company_id` pointed at
 * `companies`, so every client was a registered company. For an electrician in
 * Brussels that is wrong on most jobs — the client is the owner of the house.
 *
 * `tests/rls/clients.test.ts` proves who may read and write the client book,
 * and that "person or company" is a fact the database keeps. What only a
 * browser can show is that the choice reaches the form: that picking *a person*
 * asks for a name instead of an enterprise number, and that the site saved
 * afterwards really points at that person.
 */
test.describe("a private client", () => {
  test("is created from the site form, and the site points at them", async ({ page }) => {
    const db = admin();
    const siteName = uniqueName("Villa");
    const personName = uniqueName("Mme Dupont");
    let clientId: string | null = null;
    let siteId: string | null = null;

    try {
      await signIn(page);
      await page.goto("/en/dashboard/sites/new");

      await page.getByRole("button", { name: /new client/i }).click();
      await page.getByRole("button", { name: /^a person$/i }).click();

      // The point of the whole issue: no register search, no enterprise
      // number — a field for a name, because that is all there is to know.
      await expect(page.locator("#person-name")).toBeVisible();
      await expect(page.locator("#client-search")).toHaveCount(0);

      await page.locator("#person-name").fill(personName);
      await page.locator("#person-phone").fill("+32 479 00 11 22");
      await page.locator("#person-city").fill("Uccle");
      await page.getByRole("button", { name: /add this person/i }).click();

      await expect(async () => {
        const { data } = await db.from("clients").select("id,kind,phone").eq("name", personName).maybeSingle();
        expect(data, "the client the form said it created").not.toBeNull();
        expect(data!.kind, "a person, not a company").toBe("individual");
        expect(data!.phone).toBe("+32 479 00 11 22");
      }).toPass({ timeout: 15_000 });

      const { data: client } = await db.from("clients").select("id").eq("name", personName).single();
      clientId = client!.id as string;

      // Selected straight away, so the half-filled form survives.
      await expect(page.locator("#site-client")).toHaveValue(clientId);

      await page.locator("#site-name").fill(siteName);
      await page.locator("#site-street").fill("Rue Vanderkindere 12");
      await page.locator("#site-city").fill("Uccle");
      await page.locator("#site-postal").fill("1180");
      await page.getByRole("button", { name: /create|save/i }).click();

      await expect(async () => {
        const { data } = await db.from("sites").select("id,client_id").eq("name", siteName).maybeSingle();
        expect(data, "the site the form said it created").not.toBeNull();
        expect(data!.client_id, "the site points at the person").toBe(clientId);
      }).toPass({ timeout: 20_000 });

      const { data: site } = await db.from("sites").select("id").eq("name", siteName).single();
      siteId = site!.id as string;
    } finally {
      if (siteId) await db.from("sites").delete().eq("id", siteId);
      if (clientId) await db.from("clients").delete().eq("id", clientId);
    }
  });
});
