import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * Pressing the collapse button, which is the only way to prove it is reachable.
 *
 * Reported with a screenshot: half the button was missing under the header.
 * A covered element is not just invisible — it does not receive the click, and
 * Playwright's actionability check refuses to click through another element.
 * So this test fails for the exact reason a person would have complained.
 *
 * `toBeVisible()` would not have caught it: a half-covered button is visible by
 * every definition the DOM has.
 */
test.describe("the sidebar", () => {
  test("collapses and expands when the button is pressed", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/dashboard");

    const collapse = page.getByRole("button", { name: "Collapse the menu" });
    await expect(collapse).toHaveAttribute("aria-expanded", "true");

    // The assertion is the click itself. If anything is painted over the
    // button, this throws rather than silently doing nothing.
    await collapse.click();

    const expand = page.getByRole("button", { name: "Expand the menu" });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expand.click();
    await expect(page.getByRole("button", { name: "Collapse the menu" })).toHaveAttribute("aria-expanded", "true");
  });
});
