import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Who may approve hours (#57).
 *
 * Approval is the step that turns recorded time into payable time — the
 * worked-hours report counts approved minutes and nothing else. Before the
 * trigger these tests cover, the RLS on `timesheets` said only "you are a
 * member of this company", and the manager check lived in a server action. That
 * protected the button, not the table: PostgREST is reachable with the
 * publishable key, so any worker could set their own row to `approved`.
 *
 * Verified as João Ferreira (role `employee`) before the fix existed:
 *
 *   update public.timesheets set status = 'approved' where id = '…';  -> approved
 *
 * The negative cases are the point of this file. The positive ones only prove
 * that the fix did not break the normal week.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** João Ferreira — plain `employee`. */
const WORKER = DEMO.belnex.fieldUserId;
/** Sofia Almeida — `manager,supervisor`, and not an owner. */
const MANAGER = "d0000002-0000-4000-8000-000000000102";
/** Karim Benali — another `employee`, so "someone else's timesheet" is real. */
const OTHER_WORKER = "d0000002-0000-4000-8000-000000000105";

const SHEET = "b0000009-0000-4000-8000-0000000000a1";

/**
 * A fresh timesheet for `userId`, in a week far enough out that it cannot
 * collide with the seed's `(company, user, period)` uniqueness.
 *
 * Always called *before* `actAs`, so it runs with no JWT — the same context as
 * a migration. That matters: the trigger under test refuses a worker who tries
 * to create a timesheet that is already submitted, which is exactly the state
 * most of these cases need to start from. Setting up the world is not the
 * behaviour being tested.
 */
async function seedSheet(db: Client, userId: string, status = "draft"): Promise<void> {
  await db.query(
    `insert into public.timesheets (id, company_id, user_id, period_start, period_end, status)
     values ($1, $2, $3, date '2031-03-03', date '2031-03-09', $4)`,
    [SHEET, DEMO.belnex.companyId, userId, status],
  );
}

function setStatus(db: Client, status: string) {
  return attemptWrite(db, "update public.timesheets set status = $1 where id = $2", [status, SHEET]);
}

async function statusOf(db: Client): Promise<string | undefined> {
  const { rows } = await db.query<{ status: string }>("select status from public.timesheets where id = $1", [SHEET]);
  return rows[0]?.status;
}

describeIfDb("approving your own hours", () => {
  it("is refused for a worker", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "submitted");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(false);
      // Belt and braces: a policy can accept the statement and filter it to
      // zero rows, so "not refused" would not have been proof either way.
      expect(await statusOf(db)).toBe("submitted");
    });
  });

  it("is refused for a manager, who is not exempt from the second pair of eyes", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, MANAGER, "submitted");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(false);
      expect(await statusOf(db)).toBe("submitted");
    });
  });

  it("is refused as a rejection too", async () => {
    // Rejecting your own week is less obviously an attack, but it is the same
    // authority, and it lets someone erase a week a supervisor was about to see.
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "submitted");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "rejected")).toBe(false);
    });
  });
});

describeIfDb("reviewing someone else's hours", () => {
  it("works for a manager", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "submitted");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(true);
      expect(await statusOf(db)).toBe("approved");
    });
  });

  it("is refused for a colleague", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, OTHER_WORKER, "submitted");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(false);
      expect(await statusOf(db)).toBe("submitted");
    });
  });

  it("records the reviewer as whoever is logged in, not whoever the request claims", async () => {
    // Without this the audit trail is decoration: the caller supplies
    // `reviewed_by`, so it says whatever they want it to say.
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "submitted");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      await db.query("update public.timesheets set status = 'approved', reviewed_by = $1 where id = $2", [WORKER, SHEET]);
      const { rows } = await db.query<{ reviewed_by: string }>("select reviewed_by from public.timesheets where id = $1", [SHEET]);
      expect(rows[0].reviewed_by).toBe(MANAGER);
    });
  });
});

describeIfDb("the transitions themselves", () => {
  it("lets a worker submit their own week", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "draft");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "submitted")).toBe(true);
      expect(await statusOf(db)).toBe("submitted");
    });
  });

  it("lets a worker resubmit a week that came back rejected", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "rejected");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "submitted")).toBe(true);
    });
  });

  it("refuses to submit a week that belongs to someone else", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, OTHER_WORKER, "draft");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "submitted")).toBe(false);
    });
  });

  it("refuses to approve a week nobody submitted", async () => {
    // Skipping submission would let a manager approve hours the worker never
    // declared finished — including a week still being typed in.
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "draft");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(false);
      expect(await statusOf(db)).toBe("draft");
    });
  });

  it("leaves ordinary edits alone", async () => {
    // The trigger must only police the status column. If it charged at every
    // update, a worker could no longer touch their own draft.
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "draft");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const changed = await attemptWrite(db, "update public.timesheets set submitted_at = now() where id = $1", [SHEET]);
      expect(changed).toBe(true);
    });
  });
});

describeIfDb("being born approved", () => {
  // The cheaper half of the same attack, and the one the first version of the
  // fix missed entirely: never transition anything, just insert a row that is
  // already approved. Guarding the update alone left this wide open — verified
  // by hand as an employee, twenty-three invented hours that the report counted.
  const FRESH = "b0000009-0000-4000-8000-0000000000b7";

  it("refuses a worker inserting an approved timesheet", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const created = await attemptWrite(
        db,
        `insert into public.timesheets (id, company_id, user_id, period_start, period_end, status)
         values ($1, $2, $3, date '2031-07-07', date '2031-07-13', 'approved')`,
        [FRESH, DEMO.belnex.companyId, WORKER],
      );
      expect(created).toBe(false);
    });
  });

  it("refuses a worker inserting an approved entry", async () => {
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "draft");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const created = await attemptWrite(
        db,
        `insert into public.timesheet_entries (company_id, timesheet_id, starts_at, ends_at, break_minutes, status)
         values ($1, $2, timestamptz '2031-03-03 08:00+01', timestamptz '2031-03-03 16:00+01', 0, 'approved')`,
        [DEMO.belnex.companyId, SHEET],
      );
      expect(created).toBe(false);
    });
  });

  it("refuses a worker opening a timesheet in someone else's name", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const created = await attemptWrite(
        db,
        `insert into public.timesheets (id, company_id, user_id, period_start, period_end, status)
         values ($1, $2, $3, date '2031-07-07', date '2031-07-13', 'draft')`,
        [FRESH, DEMO.belnex.companyId, OTHER_WORKER],
      );
      expect(created).toBe(false);
    });
  });

  it("still lets a worker open their own week and clock in", async () => {
    // The path every real day starts on. If this broke, nobody could record
    // any hours at all — a far bigger outage than the hole being closed.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      await db.query(
        `insert into public.timesheets (id, company_id, user_id, period_start, period_end)
         values ($1, $2, $3, date '2031-07-07', date '2031-07-13')`,
        [FRESH, DEMO.belnex.companyId, WORKER],
      );
      await db.query(
        `insert into public.timesheet_entries (company_id, timesheet_id, starts_at, ends_at, break_minutes)
         values ($1, $2, timestamptz '2031-07-07 08:00+02', timestamptz '2031-07-07 16:00+02', 30)`,
        [DEMO.belnex.companyId, FRESH],
      );

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.timesheet_entries where timesheet_id = $1",
        [FRESH],
      );
      expect(rows[0].count).toBe("1");
    });
  });
});

describeIfDb("the entries underneath", () => {
  it("refuses a worker approving their own entries directly", async () => {
    // Locking the sheet while leaving the entries writable would move the
    // self-approval one join away rather than removing it — and the entries are
    // what the report aggregates.
    await withRollback(async (db) => {
      await seedSheet(db, WORKER, "submitted");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      await db.query(
        `insert into public.timesheet_entries (company_id, timesheet_id, starts_at, ends_at, break_minutes, status)
         values ($1, $2, timestamptz '2031-03-03 08:00+01', timestamptz '2031-03-03 16:00+01', 30, 'submitted')`,
        [DEMO.belnex.companyId, SHEET],
      );

      const changed = await attemptWrite(db, "update public.timesheet_entries set status = 'approved' where timesheet_id = $1", [SHEET]);
      expect(changed).toBe(false);
    });
  });
});
