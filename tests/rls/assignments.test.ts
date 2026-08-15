import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * The agenda's access rules (#23).
 *
 * Two separate questions are enforced here, and they are easy to confuse. Who
 * may *schedule* work is a role question — supervisors only. Who may move a job
 * along is a membership question — the people actually on it. A policy can see
 * who you are but not which columns you touched, so the second half lives in a
 * trigger, and these tests are the only place the split is proved.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const ASSIGNMENT_ID = "a0000001-0000-4000-8000-0000000000f1";

/** Pierre Dubois, a field worker with no management role. */
const WORKER = { userId: DEMO.belnex.fieldUserId, membershipId: "d0000003-0000-4000-8000-000000000104" } as const;
/** Lena Vermeulen, same company, not on the job. */
const BYSTANDER = { userId: "d0000002-0000-4000-8000-000000000106" } as const;

/** Schedules a job and puts the worker on it, as the Belnex manager would. */
async function scheduleJob(db: Client): Promise<void> {
  await actAs(db, DEMO.belnex.adminUserId);
  await db.query(
    `insert into public.assignments (id, company_id, site_id, starts_at, ends_at, title, status)
     values ($1, $2, $3, $4, now() + interval '2 days', now() + interval '2 days 8 hours', 'Panel mounting', 'sent')`,
    [ASSIGNMENT_ID, DEMO.belnex.companyId, DEMO.belnex.siteId],
  );
  await db.query(
    `insert into public.assignment_assignees (company_id, assignment_id, company_membership_id, source)
     values ($1, $2, $3, 'direct')`,
    [DEMO.belnex.companyId, ASSIGNMENT_ID, WORKER.membershipId],
  );
}

describeIfDb("scheduling work", () => {
  it("a supervisor may schedule", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);
      await scheduleJob(db);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.assignments where id = $1",
        [ASSIGNMENT_ID],
      );
      expect(rows[0].count).toBe("1");
    });
  });

  it("a worker may not schedule", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      const wrote = await attemptWrite(
        db,
        `insert into public.assignments (company_id, starts_at, ends_at, title)
         values ($1, now(), now() + interval '1 day', 'Self-booked')`,
        [DEMO.belnex.companyId],
      );
      expect(wrote).toBe(false);
    });
  });

  it("refuses a job that ends before it starts", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.assignments (company_id, starts_at, ends_at, title)
         values ($1, now() + interval '2 days', now() + interval '1 day', 'Backwards')`,
        [DEMO.belnex.companyId],
      );
      expect(wrote).toBe(false);
    });
  });
});

describeIfDb("moving a job along", () => {
  it("the person on the job may change its status", async () => {
    await withRollback(async (db) => {
      await scheduleJob(db);
      await actAs(db, WORKER.userId);
      expect(await attemptWrite(db, "update public.assignments set status = 'accepted' where id = $1", [ASSIGNMENT_ID])).toBe(true);

      const { rows } = await db.query<{ status: string }>("select status from public.assignments where id = $1", [
        ASSIGNMENT_ID,
      ]);
      expect(rows[0].status).toBe("accepted");
    });
  });

  it("a colleague who is not on the job may not", async () => {
    // The company can read the schedule — it is not secret — but reading it is
    // not the same as being able to mark someone else's work done.
    await withRollback(async (db) => {
      await scheduleJob(db);
      await actAs(db, BYSTANDER.userId);
      expect(await attemptWrite(db, "update public.assignments set status = 'done' where id = $1", [ASSIGNMENT_ID])).toBe(false);
    });
  });

  it("the person on the job may not rewrite what the job is", async () => {
    // The policy sees who you are, never which columns you touched. Without the
    // trigger, being on a job would mean being able to redefine it.
    await withRollback(async (db) => {
      await scheduleJob(db);
      await actAs(db, WORKER.userId);
      const rewrote = await attemptWrite(db, "update public.assignments set title = 'Something else' where id = $1", [
        ASSIGNMENT_ID,
      ]);
      expect(rewrote).toBe(false);
    });
  });

  it("a supervisor may rewrite it", async () => {
    await withRollback(async (db) => {
      await scheduleJob(db);
      await actAs(db, DEMO.belnex.adminUserId);
      expect(
        await attemptWrite(db, "update public.assignments set title = 'Panel mounting, sector B' where id = $1", [
          ASSIGNMENT_ID,
        ]),
      ).toBe(true);
    });
  });
});

describeIfDb("the delegation chain", () => {
  it("refuses to put the same company in the chain twice", async () => {
    // Depth alone does not stop a loop — A to B, B back to A — it only makes it
    // terminate at five. Work circling back to someone who already passed it on
    // is never a real arrangement.
    await withRollback(async (db) => {
      await scheduleJob(db);
      await actAs(db, DEMO.belnex.adminUserId);
      const cycled = await attemptWrite(
        db,
        `insert into public.assignments (company_id, starts_at, ends_at, title, parent_assignment_id)
         values ($1, now() + interval '3 days', now() + interval '4 days', 'Delegated back', $2)`,
        [DEMO.belnex.companyId, ASSIGNMENT_ID],
      );
      expect(cycled).toBe(false);
    });
  });

  it("refuses a parent that does not exist", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      const orphan = await attemptWrite(
        db,
        `insert into public.assignments (company_id, starts_at, ends_at, title, parent_assignment_id)
         values ($1, now(), now() + interval '1 day', 'Orphan', $2)`,
        [DEMO.belnex.companyId, "a0000001-0000-4000-8000-0000000000ff"],
      );
      expect(orphan).toBe(false);
    });
  });
});

describeIfDb("another company", () => {
  it("sees neither the work nor who is on it", async () => {
    await withRollback(async (db) => {
      await scheduleJob(db);
      await actAs(db, DEMO.nordclean.adminUserId);

      const assignments = await db.query<{ count: string }>(
        "select count(*)::text as count from public.assignments where company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(assignments.rows[0].count).toBe("0");

      const assignees = await db.query<{ count: string }>(
        "select count(*)::text as count from public.assignment_assignees where assignment_id = $1",
        [ASSIGNMENT_ID],
      );
      expect(assignees.rows[0].count).toBe("0");
    });
  });

  it("cannot schedule work into someone else's company", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.nordclean.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.assignments (company_id, starts_at, ends_at, title)
         values ($1, now(), now() + interval '1 day', 'Injected')`,
        [DEMO.belnex.companyId],
      );
      expect(wrote).toBe(false);
    });
  });
});
