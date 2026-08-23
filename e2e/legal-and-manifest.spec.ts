import { expect, test } from "@playwright/test";

/**
 * The two things the unit tests cannot see: whether the manifest is actually
 * served, and whether the legal pages actually render.
 *
 * Both fail silently. A manifest rewritten into a locale prefix returns 404 and
 * the only symptom is an install prompt that never appears — no error, no log,
 * nothing on screen. A legal page that throws in a Server Component shows a
 * generic error the visitor reads as "this company has no privacy policy".
 */
test.describe("the web manifest", () => {
  test("is served at the root, with icons that load", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    // The assertion that matters. Before the middleware learned to skip it,
    // this was a 404 and everything else about the feature looked fine.
    expect(response.status(), "the manifest must not be rewritten into a locale").toBe(200);

    const manifest = await response.json();
    expect(manifest.start_url).toBe("/ponto");
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.length).toBeGreaterThan(1);

    // A manifest is a promise about files it does not contain.
    for (const icon of manifest.icons) {
      const image = await request.get(icon.src);
      expect(image.status(), `${icon.src} is declared in the manifest`).toBe(200);
      expect(image.headers()["content-type"]).toContain("image/png");
    }

    const apple = await request.get("/apple-icon.png");
    expect(apple.status(), "iOS reads this one instead of the manifest").toBe(200);
  });

  test("opens the clock, and the clock is a real page", async ({ page }) => {
    // `start_url` pointing at a 404 would install an app that opens onto
    // nothing. Signed out this redirects to the login screen, which is the
    // right answer — what must not happen is a missing route.
    const response = await page.goto("/ponto");
    expect(response?.status()).toBeLessThan(400);
    // Signed out, the first launch of the installed app lands on the login
    // screen. That is the intended first run, and it is only correct because
    // the route exists to redirect from.
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("the legal pages", () => {
  test("are reachable from the footer, and are not empty", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(page).toHaveURL(/\/legal\/privacy$/);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy notice");
    // The claim the whole page exists to make. If the content module ever
    // returned an empty document, everything above would still pass.
    await expect(page.getByRole("heading", { name: /Location: what is not recorded/i })).toBeVisible();
    expect((await page.getByRole("heading", { level: 2 }).all()).length).toBeGreaterThan(5);
  });

  test("tell a reader when they are not getting their own language", async ({ page }) => {
    await page.goto("/pl/legal/terms");
    // Polish has no version of these documents. Serving English silently would
    // read as a broken page; the notice is what makes the gap honest.
    await expect(page.getByText(/Czytasz wersję angielską/)).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of service");
  });

  test("say nothing about a fallback when there is none", async ({ page }) => {
    await page.goto("/nl/legal/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacyverklaring");
    await expect(page.getByText(/U leest de Engelse versie/)).toHaveCount(0);
  });
});
