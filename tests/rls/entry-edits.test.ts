import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Correcting an entry, and where correction has to stop (#56).
 *
 * The trigger added in #57 policed `timesheet_entries.status` and nothing else,
 * which guards the label on the box rather than what is inside it. Verified as
 * João Ferreira, role `employee`, before this existed:
 *
 *   update timesheet_entries set ends_at = ends_at + interval '3 hours'
 *     where id = <his own, already approved>;   -> 540 minutes became 720
 *
 * The same statement against a colleague's approved entry was also accepted. So
 * approval decided nothing: a week could be signed off and then quietly grow,
 * and the report would show the new figure with no sign anything had moved.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** João Ferreira — plain `employee`. */
const WORKER = DEMO.belnex.fieldUserId;
/** Karim Benali — a colleague, same company. */
const COLLEAGUE = "d0000002-0000-4000-8000-000000000105";
/** Sofia Almeida — manager. */
const MANAGER = "d0000002-0000-4000-8000-000000000102";

const SHEET = "b0000009-0000-4000-8000-0000000000e1";
const ENTRY = "b0000009-0000-4000-8000-0000000000e2";

/**
 * A timesheet and one entry in a given state, seeded with no JWT.
 *
 * Before `actAs`, deliberately: the rules under test refuse a worker who tries
 * to create an already-approved row, which is the state most of these cases
 * need to start from. Building the world is not the behaviour being tested.
 */
async function seedEntry(db: Client, userId: string, status: string): Promise<void> {
  await db.query(
    `insert into public.timesheets (id, company_id, user_id, period_start, period_end, status)
     values ($1, $2, $3, date '2031-09-01', date '2031-09-07', $4)`,
    [SHEET, DEMO.belnex.companyId, userId, status],
  );
  await db.query(
    `insert into public.timesheet_entries (id, company_id, timesheet_id, starts_at, ends_at, break_minutes, status)
     values ($1, $2, $3, timestamptz '2031-09-01 08:00+02', timestamptz '2031-09-01 17:00+02', 30, $4)`,
    [ENTRY, DEMO.belnex.companyId, SHEET, status],
  );
}

/** The edit that matters: making the shift longer. */
function extendBy(db: Client, hours: number) {
  return attemptWrite(db, `update public.timesheet_entries set ends_at = ends_at + interval '${hours} hours' where id = $1`, [ENTRY]);
}

async function minutesOf(db: Client): Promise<number> {
  const { rows } = await db.query<{ minutes: string }>(
    "select (extract(epoch from (ends_at - starts_at)) / 60)::text as minutes from public.timesheet_entries where id = $1",
    [ENTRY],
  );
  return Number(rows[0].minutes);
}

describeIfDb("approved hours", () => {
  it("cannot be extended by the person they belong to", async () => {
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "approved");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await extendBy(db, 3)).toBe(false);
      // The refusal is the point, but so is the row: a policy that accepts the
      // statement and filters it to zero rows would also "not throw".
      expect(await minutesOf(db)).toBe(540);
    });
  });

  it("cannot be edited by a manager either", async () => {
    // Approval is a decision with a name on it. Letting the approver quietly
    // revise it afterwards makes the decision meaningless in the other
    // direction — the correction route is to reopen the week, which is recorded.
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "approved");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await extendBy(db, 1)).toBe(false);
      expect(await minutesOf(db)).toBe(540);
    });
  });

  it("still allows the status itself to be reopened", async () => {
    // Otherwise a mistake caught after approval could never be fixed at all.
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "approved");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      const reopened = await attemptWrite(db, "update public.timesheet_entries set status = 'draft' where id = $1", [ENTRY]);
      expect(reopened).toBe(true);
    });
  });
});

describeIfDb("editing your own entry", () => {
  it("works while it is a draft", async () => {
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "draft");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await attemptWrite(db, "update public.timesheet_entries set break_minutes = 45 where id = $1", [ENTRY])).toBe(true);
    });
  });

  it("works after it was rejected, which is the point of rejecting it", async () => {
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "rejected");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await extendBy(db, 1)).toBe(true);
    });
  });

  it("is refused while it is submitted and waiting", async () => {
    // Editing underneath a reviewer means they approve a different week from
    // the one they read.
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "submitted");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await extendBy(db, 1)).toBe(false);
      expect(await minutesOf(db)).toBe(540);
    });
  });
});

describeIfDb("editing somebody else's entry", () => {
  it("is refused for a colleague", async () => {
    await withRollback(async (db) => {
      await seedEntry(db, COLLEAGUE, "draft");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await extendBy(db, 1)).toBe(false);
      expect(await minutesOf(db)).toBe(540);
    });
  });

  it("works for a manager on a submitted week, which is what reviewing means", async () => {
    // Correcting the break that came in at zero is the reason a supervisor
    // opens the screen at all.
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "submitted");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await attemptWrite(db, "update public.timesheet_entries set break_minutes = 45 where id = $1", [ENTRY])).toBe(true);
    });
  });
});

describeIfDb("moving an entry", () => {
  it("cannot be reassigned to another timesheet", async () => {
    // Otherwise someone else's hours can be relabelled as yours, without
    // changing a single number.
    await withRollback(async (db) => {
      await seedEntry(db, WORKER, "draft");
      const other = "b0000009-0000-4000-8000-0000000000e3";
      await db.query(
        `insert into public.timesheets (id, company_id, user_id, period_start, period_end, status)
         values ($1, $2, $3, date '2031-09-08', date '2031-09-14', 'draft')`,
        [other, DEMO.belnex.companyId, COLLEAGUE],
      );
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const moved = await attemptWrite(db, "update public.timesheet_entries set timesheet_id = $1 where id = $2", [other, ENTRY]);
      expect(moved).toBe(false);
    });
  });
});
