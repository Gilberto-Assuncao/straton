import { expect, test } from "@playwright/test";
import { admin, signIn } from "./helpers";

/**
 * Looking at a customer's data as platform support, end to end (#19).
 *
 * Four things no other layer walks together. The RLS suite proves a platform
 * admin gets nothing through policies; the unit suite proves a session expires.
 * Neither of them ever presses "Open a session", and the whole feature is a
 * chain of steps that each work on their own: the route hides itself from the
 * wrong person, the button writes a session *and* an audit row, the customer's
 * screen actually renders their data, and ending it puts the door back.
 *
 * The last one is the reason this file exists. A revoke that reports success
 * and leaves the page serving is the failure this project has found in five
 * other shapes, and here it would mean an expired support session still
 * showing a company's payroll.
 */
const NORDCLEAN = "d0000001-0000-4000-8000-000000000002";
const WORKER_EMAIL = "joao.ferreira@belnex.straton.demo";

test.describe("platform support access", () => {
  test("does not exist for somebody who is not a platform admin", async ({ page }) => {
    await signIn(page, WORKER_EMAIL);

    // 404 and not 403. A permission screen tells the person the route is real.
    const response = await page.goto("/en/dashboard/support");
    expect(response?.status(), "the support route for a field worker").toBe(404);

    // And it is not advertised either — the nav entry is the other half of
    // hiding a route, and the one a screenshot would have missed.
    await page.goto("/en/dashboard");
    await expect(page.getByRole("link", { name: "Support", exact: true })).toHaveCount(0);
  });

  test("opens on a named company, is recorded, and stops when it is ended", async ({ page }) => {
    const db = admin();
    await signIn(page);

    await page.goto("/en/dashboard/support");
    await page.getByLabel("Find a company").fill("Nordclean");
    await page.getByRole("button", { name: /open a session/i }).click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/support/${NORDCLEAN}$`));

    // The banner is not decoration: it is the only thing on screen that says
    // whose data this is, so its absence is a defect of the same size as a
    // broken query.
    //
    // The name is read from the database rather than written here. The first
    // version of this line hardcoded "Nordclean Services BV", which is the
    // seed's `legal_name`; the banner shows `name`, "NORDCLEAN SERVICES". A
    // test that spells the fixture out by hand is asserting the seed as much
    // as the feature, and it fails on whichever of the two the author guessed
    // wrong.
    const { data: company } = await db.from("companies").select("name").eq("id", NORDCLEAN).single();
    expect(company?.name, "the company the banner has to name").toBeTruthy();
    const banner = page.getByRole("status").filter({ hasText: /read only/i });
    await expect(banner).toContainText(company!.name as string);

    // Their data, not ours. Anouk Peeters is in Nordclean and in no company
    // Marc belongs to, so her name on this page can only have come through the
    // support session.
    await expect(page.getByText("Anouk Peeters")).toBeVisible();

    // The screen is not evidence. One open session, naming this company and
    // this admin.
    const { data: sessions } = await db
      .from("support_sessions")
      .select("id,company_id,ended_at,expires_at")
      .eq("company_id", NORDCLEAN)
      .is("ended_at", null);
    expect(sessions ?? [], "open support sessions on Nordclean").toHaveLength(1);
    const sessionId = sessions![0].id as string;
    expect(
      new Date(sessions![0].expires_at as string).getTime(),
      "a session that expires in the future",
    ).toBeGreaterThan(Date.now());

    // And the customer's own record of it, in their company's log — the part
    // of this feature that is a promise to somebody outside the building.
    const { data: audit } = await db
      .from("audit_logs")
      .select("action,metadata,company_id")
      .eq("company_id", NORDCLEAN)
      .eq("action", "support_session_started");
    expect(audit ?? [], "the customer's audit entry").toHaveLength(1);
    expect(audit![0].metadata).toMatchObject({ access: "read-only" });

    await page.getByRole("button", { name: /end the session/i }).click();

    // Off the customer's data, not just out of the session.
    await expect(page).toHaveURL(/\/dashboard\/support$/);

    const { data: closed } = await db
      .from("support_sessions")
      .select("ended_at")
      .eq("id", sessionId)
      .single();
    expect(closed?.ended_at, "the session row after ending it").not.toBeNull();

    // The door, tried again by hand. This is the assertion the feature lives or
    // dies on: a closed session must make the URL stop working, not merely stop
    // being linked to.
    const afterEnd = await page.goto(`/en/dashboard/support/${NORDCLEAN}`);
    expect(afterEnd?.status(), "a company page after the session was ended").toBe(404);

    // Cleanup: the demo dataset is shared with every other spec in this run.
    await db.from("support_sessions").delete().eq("company_id", NORDCLEAN);
    await db.from("audit_logs").delete().eq("company_id", NORDCLEAN).eq("action", "support_session_started");
    await db.from("audit_logs").delete().eq("company_id", NORDCLEAN).eq("action", "support_session_ended");
  });

  test("refuses a session presented for a company it does not name", async ({ page }) => {
    // The address-bar case. A real, open session for Nordclean and another
    // company's id typed in — the one attempt that does not need a bug
    // anywhere else to be worth trying.
    const db = admin();
    await signIn(page);

    await page.goto("/en/dashboard/support");
    await page.getByLabel("Find a company").fill("Nordclean");
    await page.getByRole("button", { name: /open a session/i }).click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/support/${NORDCLEAN}$`));

    const { data: others } = await db.from("companies").select("id").neq("id", NORDCLEAN).limit(1);
    expect(others ?? [], "another company to try the cookie against").toHaveLength(1);

    const elsewhere = await page.goto(`/en/dashboard/support/${others![0].id}`);
    expect(elsewhere?.status(), "a Nordclean session used on another company").toBe(404);

    await page.goto(`/en/dashboard/support/${NORDCLEAN}`);
    await page.getByRole("button", { name: /end the session/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/support$/);

    await db.from("support_sessions").delete().eq("company_id", NORDCLEAN);
    await db.from("audit_logs").delete().eq("company_id", NORDCLEAN).eq("action", "support_session_started");
    await db.from("audit_logs").delete().eq("company_id", NORDCLEAN).eq("action", "support_session_ended");
  });
});
