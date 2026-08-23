import { expect, test, type Browser, type Page } from "@playwright/test";
import { admin, BELNEX_COMPANY_ID, signIn, uniqueName } from "./helpers";

/**
 * Swapping a shift, walked by three different people (#25).
 *
 * The database has been able to do this since 202608070001, and
 * `tests/rls/assignment-swaps.test.ts` proves the state machine: the two
 * approvals in series, the refusals, and the assignee moving on approval. None
 * of that was reachable — there was no interface, so the feature existed only
 * in the schema.
 *
 * This is the part only a browser can check: that a worker can ask, that the
 * colleague sees the request and can accept it, that the supervisor's Approve
 * appears only after that, and that pressing it actually moves the shift. Three
 * separate browser contexts, because it is three separate people — the same
 * session doing all three would prove nothing about who sees what.
 */
const WORKER = "joao.ferreira@belnex.straton.demo";
const COLLEAGUE = "karim.benali@belnex.straton.demo";
const SUPERVISOR = "sofia.almeida@belnex.straton.demo";

/** Seed memberships, fixed by `supabase/seed-demo.sql`. */
const WORKER_MEMBERSHIP = "d0000003-0000-4000-8000-000000000104";
const COLLEAGUE_MEMBERSHIP = "d0000003-0000-4000-8000-000000000105";

async function asUser(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, email);
  return page;
}

test.describe("shift swap", () => {
  test("is proposed, accepted, approved — and the shift changes hands", async ({ browser }) => {
    const db = admin();
    const title = uniqueName("Swap");
    const today = new Date();
    const at = (hour: number) =>
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hour)).toISOString();

    // Setup, not the subject: the shift is created straight in the database so
    // that a failure here is unambiguous. Creating one through the form is
    // already covered elsewhere.
    const { data: created, error } = await db
      .from("assignments")
      .insert({ company_id: BELNEX_COMPANY_ID, title, starts_at: at(9), ends_at: at(17), status: "sent" })
      .select("id")
      .single();
    expect(error, "the fixture shift").toBeNull();
    const assignmentId = created!.id as string;

    try {
      await db
        .from("assignment_assignees")
        .insert({ company_id: BELNEX_COMPANY_ID, assignment_id: assignmentId, company_membership_id: WORKER_MEMBERSHIP });

      // 1 — the person giving the shift away asks a named colleague.
      const worker = await asUser(browser, WORKER);
      await worker.goto("/en/dashboard/agenda");
      const workerCard = worker.locator("li").filter({ hasText: title });
      await expect(workerCard).toBeVisible();
      await workerCard.getByRole("button", { name: /ask a colleague/i }).click();
      await workerCard.getByLabel(/colleague/i).selectOption(COLLEAGUE_MEMBERSHIP);
      await workerCard.getByRole("button", { name: /send request/i }).click();

      // The screen is allowed to say whatever it likes. This is the assertion.
      await expect(async () => {
        const { data } = await db.from("assignment_swaps").select("status").eq("assignment_id", assignmentId);
        expect(data?.[0]?.status).toBe("proposed");
      }).toPass({ timeout: 10_000 });

      // 2 — the colleague, who has to go first. Without this the supervisor
      // would be approving a transfer one side knows nothing about.
      const colleague = await asUser(browser, COLLEAGUE);
      await colleague.goto("/en/dashboard/agenda");
      const colleagueCard = colleague.locator("li").filter({ hasText: title });
      await expect(colleagueCard.getByText(/asked you to take this shift/i)).toBeVisible();
      await colleagueCard.getByRole("button", { name: /^accept$/i }).click();

      await expect(async () => {
        const { data } = await db.from("assignment_swaps").select("status").eq("assignment_id", assignmentId);
        expect(data?.[0]?.status).toBe("accepted_by_peer");
      }).toPass({ timeout: 10_000 });

      // 3 — and only now the supervisor.
      const supervisor = await asUser(browser, SUPERVISOR);
      await supervisor.goto("/en/dashboard/agenda");
      const supervisorCard = supervisor.locator("li").filter({ hasText: title });
      await expect(supervisorCard.getByRole("button", { name: /^approve$/i })).toBeVisible();
      await supervisorCard.getByRole("button", { name: /^approve$/i }).click();

      // The acceptance criterion, in one assertion: the shift is now the
      // colleague's, and the record of who was asked to give it up survives.
      await expect(async () => {
        const { data: assignees } = await db
          .from("assignment_assignees")
          .select("company_membership_id")
          .eq("assignment_id", assignmentId);
        expect(assignees?.map((row) => row.company_membership_id)).toEqual([COLLEAGUE_MEMBERSHIP]);

        const { data: swap } = await db
          .from("assignment_swaps")
          .select("status,from_membership_id,to_membership_id")
          .eq("assignment_id", assignmentId)
          .single();
        expect(swap?.status).toBe("approved");
        expect(swap?.from_membership_id, "the history keeps who originally had it").toBe(WORKER_MEMBERSHIP);
        expect(swap?.to_membership_id).toBe(COLLEAGUE_MEMBERSHIP);
      }).toPass({ timeout: 10_000 });
    } finally {
      // Cascades to the assignees and the swap.
      await db.from("assignments").delete().eq("id", assignmentId);
    }
  });

  test("a supervisor cannot approve before the colleague has answered", async ({ browser }) => {
    // The rule the whole design turns on, checked where it is enforced for the
    // reader rather than for the database: the button is not there yet.
    const db = admin();
    const title = uniqueName("Swap early");
    const today = new Date();
    const at = (hour: number) =>
      new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hour)).toISOString();

    const { data: created } = await db
      .from("assignments")
      .insert({ company_id: BELNEX_COMPANY_ID, title, starts_at: at(9), ends_at: at(17), status: "sent" })
      .select("id")
      .single();
    const assignmentId = created!.id as string;

    try {
      await db
        .from("assignment_assignees")
        .insert({ company_id: BELNEX_COMPANY_ID, assignment_id: assignmentId, company_membership_id: WORKER_MEMBERSHIP });
      await db.from("assignment_swaps").insert({
        company_id: BELNEX_COMPANY_ID,
        assignment_id: assignmentId,
        from_membership_id: WORKER_MEMBERSHIP,
        to_membership_id: COLLEAGUE_MEMBERSHIP,
      });

      const supervisor = await asUser(browser, SUPERVISOR);
      await supervisor.goto("/en/dashboard/agenda");
      const card = supervisor.locator("li").filter({ hasText: title });
      await expect(card.getByText(/waiting for/i)).toBeVisible();
      await expect(card.getByRole("button", { name: /^approve$/i })).toHaveCount(0);
      // Refuse stays available: a supervisor may kill a request at any point.
      await expect(card.getByRole("button", { name: /^refuse$/i })).toBeVisible();
    } finally {
      await db.from("assignments").delete().eq("id", assignmentId);
    }
  });
});
