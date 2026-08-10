import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

/**
 * The demo accounts, which the seed creates with confirmed e-mails so a test
 * can sign in without a mailbox.
 *
 * Password is the seed's, in the open on purpose: `supabase/seed-demo.sql`
 * prints it in a comment, these accounts exist only in demo data, and a secret
 * that has to be shared with CI is not a secret. If this ever points at a real
 * environment, that is the bug — not this line.
 */
export const DEMO_PASSWORD = "straton-demo-2026";
export const ADMIN_EMAIL = "marc.dubois@belnex.straton.demo";
export const BELNEX_COMPANY_ID = "d0000001-0000-4000-8000-000000000001";

/**
 * A client that bypasses RLS, for asserting what actually happened.
 *
 * This is the whole point of the file. The screen is not evidence: a delete
 * with no policy behind it affects nothing, raises no error, and still shows a
 * success message. So every test that changes something checks here, where RLS
 * cannot make an empty result look like a full one.
 *
 * Service role, and therefore never used to *perform* the action under test —
 * only to look afterwards. Doing the write here would prove the database works
 * and say nothing about the button.
 */
export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Without them a test could only read what the screen chose to show it.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Signs in through the real form, because the login page is also under test. */
export async function signIn(page: Page, email = ADMIN_EMAIL): Promise<void> {
  await page.goto("/en/login");
  // By id, not by label. `getByLabel(/password/i)` also matches the "Show
  // password" button next to the field, and Playwright refuses an ambiguous
  // locator rather than guessing — correctly, but it means the obvious locator
  // is the wrong one here.
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Waiting for the destination, not for a spinner to vanish. A redirect that
  // silently lands back on /login is the failure this catches.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

/** A name nothing else will collide with, so a leftover row is obvious. */
export function uniqueName(prefix: string): string {
  return `${prefix} e2e ${Date.now()}`;
}
