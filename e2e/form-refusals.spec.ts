import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, DEMO_PASSWORD } from "./helpers";

/**
 * What a form does when it says no (#74).
 *
 * Two separate failures with one cause, and the second is the one that cost
 * real time. A refused submission re-renders a fresh form, so the boxes empty —
 * *and* the message describing the attempt stays, now sitting above whatever
 * was typed next. On the availability form that produced a ghost error: good
 * dates under a red sentence about dates that no longer existed anywhere.
 *
 * Neither half is visible to a type checker or to the RLS suite. Both are
 * obvious the moment somebody types.
 */
test.describe("a refused sign-in", () => {
  test("keeps the e-mail, never the password", async ({ page }) => {
    await page.goto("/en/login");

    await page.locator("#login-email").fill(ADMIN_EMAIL);
    await page.locator("#login-password").fill("not-the-password");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // The refusal has to arrive before anything can be asserted about what
    // survived it.
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });

    await expect(page.locator("#login-email"), "the address, typed correctly").toHaveValue(ADMIN_EMAIL);
    // The asymmetry is deliberate and is the security half: a password put back
    // on screen after a failed attempt is the opposite of what anyone wants.
    await expect(page.locator("#login-password"), "the password, which never travels back").toHaveValue("");
  });

  test("and the message goes as soon as you fix it", async ({ page }) => {
    await page.goto("/en/login");

    await page.locator("#login-email").fill(ADMIN_EMAIL);
    await page.locator("#login-password").fill("not-the-password");
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    const refusal = page.getByRole("alert");
    await expect(refusal).toBeVisible({ timeout: 20_000 });

    // The ghost. Before this fix the sentence stayed while the person retyped,
    // describing an attempt that no longer existed — and the evidence of the
    // real failure had already been cleared by the same bug.
    await page.locator("#login-password").fill(DEMO_PASSWORD);
    await expect(refusal, "a refusal about a password that has since changed").not.toBeVisible();
  });
});
