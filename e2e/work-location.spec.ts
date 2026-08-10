import { expect, test } from "@playwright/test";
import { admin, signIn, uniqueName } from "./helpers";

/**
 * The first end-to-end flows: create a work location, and start the clock.
 *
 * Chosen deliberately over something showier. Creating a location is the first
 * thing a new company does, and every bug reported from production this month
 * was on paths like it — the team that could not be created, the client that
 * could not be added, the employee that could not be edited, the clock that
 * could not be started. All of them passed typecheck, build and CI.
 *
 * The house rule is in `playwright.config.ts` and it is the whole point:
 * assert against the database, never against the toast.
 */
test.describe("work location", () => {
  test("can be created, and the row really exists", async ({ page }) => {
    const name = uniqueName("Chantier");
    const db = admin();

    await signIn(page);
    await page.goto("/en/dashboard/sites/new");

    // By id rather than by label text. The labels are translated, so a locator
    // written against the English wording would fail the day someone runs the
    // suite in another locale — which is a test failure that teaches nothing.
    await page.locator("#site-name").fill(name);
    await page.locator("#site-street").fill("Rue de la Loi 16");
    await page.locator("#site-city").fill("Brussels");
    await page.locator("#site-postal").fill("1000");
    await page.getByRole("button", { name: /create|save/i }).click();

    // The screen is allowed to say whatever it likes; this is the assertion.
    await expect(async () => {
      const { data } = await db.from("sites").select("id").eq("name", name).maybeSingle();
      expect(data, "the work location the form said it created").not.toBeNull();
    }).toPass({ timeout: 20_000 });

    const { data: site } = await db.from("sites").select("id").eq("name", name).single();
    const siteId = site!.id as string;

    // Every location gets a subdivision automatically (#77), so a report always
    // has something to group by. If that ever stops happening it stops silently
    // — nothing on screen mentions it.
    const { data: areas } = await db.from("site_areas").select("id").eq("site_id", siteId);
    expect(areas ?? [], "the default subdivision created with the location").toHaveLength(1);

    await db.from("sites").delete().eq("id", siteId);
  });
});

/**
 * Reported from production, with a screenshot: the Tarefa dropdown was empty
 * and the clock would not start.
 *
 * The company had written down no tasks, `TaskSelector` rendered `<select
 * required>` with no options, and the browser refused to submit a form whose
 * required field had nothing valid to choose. No error message, because there
 * was no invalid value — there was an absence of values.
 *
 * Both columns were nullable all along. The obligation was invented in the UI.
 * This test is here so it cannot be invented again: a company with nothing
 * written down still has people working, and the hours are the part that cannot
 * be recovered later.
 */
test.describe("clock", () => {
  test("starts with no project and no task", async ({ page }) => {
    const db = admin();

    await signIn(page);
    await page.goto("/en/dashboard/time");

    // Empty on purpose. This is exactly the state that was a dead end.
    await page.locator("#tracker-project").selectOption("");
    await page.locator("#tracker-task").selectOption("");
    await page.getByRole("button", { name: /^start$/i }).click();

    await expect(async () => {
      const { data } = await db
        .from("time_sessions")
        .select("id,project_id,task_id")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      expect(data, "the open session the clock should have opened").not.toBeNull();
      expect(data!.project_id, "project, left blank on purpose").toBeNull();
      expect(data!.task_id, "task, left blank on purpose").toBeNull();
    }).toPass({ timeout: 20_000 });

    // The clock is now running for this account, and a second open session is
    // refused by a unique index. Leaving it open would make every later run of
    // this test fail for a reason that has nothing to do with the code.
    await db.from("time_sessions").delete().is("ended_at", null);
  });
});
