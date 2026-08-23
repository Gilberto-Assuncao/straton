import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * The in-app manual, reached the way a reader reaches it (#46).
 *
 * `tests/unit/help-content.test.ts` proves the guides are complete and still
 * explain the seven rules they exist for. What only a browser shows is that
 * they are reachable at all: that the sidebar entry has a label rather than the
 * raw key path, that the cards lead somewhere, and that a reader whose language
 * has no guide is told which version they are getting instead of silently
 * receiving English.
 */
test.describe("the manual", () => {
  test("is reachable from the sidebar, and the admin's guide comes first", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/dashboard");

    // From the menu, not by URL: a missing `nav.help` key renders as
    // "nav.help" and everything else stays green — which is exactly what
    // reached production once.
    await page.getByRole("link", { name: "Help", exact: true }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/help$/);

    // By destination, not by heading level: `PageHeader` renders the page
    // title as an h2 as well, so counting h2s counts five things and finds the
    // wrong one first.
    const cards = page.locator('a[href*="/dashboard/help/"]');
    await expect(cards).toHaveCount(4);
    // Signed in as an owner/admin, so the company guide leads.
    await expect(cards.first()).toContainText("Running the company");

    // And the cards lead somewhere. A grid of four links to nothing would
    // satisfy every assertion above.
    await page.getByRole("link", { name: /Running the company/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/help\/manager$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Running the company");
  });

  test("explains the rule a supervisor would otherwise report as a bug", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/dashboard/help/supervisor");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Planning the week");
    await expect(page.getByRole("heading", { name: /freezes who was in it/i })).toBeVisible();
    // No notice: English is a language the guides were written in.
    await expect(page.getByText(/has not been translated/i)).toHaveCount(0);
  });

  test("tells a Polish reader they are getting English", async ({ page }) => {
    await signIn(page);
    await page.goto("/pl/dashboard/help/worker");
    await expect(page.getByText(/Poniżej wersja angielska/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your week, and your hours");
  });

  test("sends a Brazilian reader to Portuguese, and says which Portuguese", async ({ page }) => {
    // The one fallback that is not English, and the reason the map exists.
    await signIn(page);
    await page.goto("/pt-BR/dashboard/help/worker");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A tua semana, e as tuas horas");
    await expect(page.getByText(/português europeu/i)).toBeVisible();
  });

  test("a guide that does not exist is a 404, not an empty page", async ({ page }) => {
    await signIn(page);
    const response = await page.goto("/en/dashboard/help/accountant");
    expect(response?.status()).toBe(404);
  });
});
