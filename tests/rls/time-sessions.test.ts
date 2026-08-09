import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * The clock-in that survives the device (#60).
 *
 * Before this table, a running timer lived only in React state — lock the
 * phone, let iOS discard the tab, and eight hours of work vanished with no
 * error and no record. A row is what makes the day exist independently of the
 * browser that started it.
 *
 * Which also makes it a payroll record, so the fields that decide how many
 * hours it becomes are not the caller's to choose.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** João Ferreira — plain `employee`. */
const WORKER = DEMO.belnex.fieldUserId;
/** Karim Benali — a colleague, same company, no review rights. */
const COLLEAGUE = "d0000002-0000-4000-8000-000000000105";
/** Sofia Almeida — manager, so she may see who is clocked in. */
const MANAGER = "d0000002-0000-4000-8000-000000000102";
/** Nordclean's admin — a different company entirely. */
const OUTSIDER = DEMO.nordclean.adminUserId;

function openSession(db: Client, userId: string, startedAt?: string) {
  return db.query<{ id: string; started_at: string }>(
    `insert into public.time_sessions (company_id, user_id${startedAt ? ", started_at" : ""})
     values ($1, $2${startedAt ? ", $3" : ""}) returning id, started_at`,
    startedAt ? [DEMO.belnex.companyId, userId, startedAt] : [DEMO.belnex.companyId, userId],
  );
}

function visibleCount(db: Client, id: string) {
  return db
    .query<{ count: string }>("select count(*)::text as count from public.time_sessions where id = $1", [id])
    .then(({ rows }) => Number(rows[0].count));
}

describeIfDb("starting the clock", () => {
  it("stamps the start time itself, ignoring whatever the caller sent", async () => {
    // The money field. A start the client can choose is a start the client can
    // backdate, and this row becomes paid hours the moment it closes.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const { rows } = await openSession(db, WORKER, "2020-01-01T03:00:00Z");
      const started = new Date(rows[0].started_at).getTime();
      expect(Date.now() - started).toBeLessThan(60_000);
    });
  });

  it("refuses a second clock for the same person", async () => {
    // Two open sessions are two overlapping claims on the same hour, and
    // whichever closes second silently wins.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      await openSession(db, WORKER);

      const second = await attemptWrite(
        db,
        "insert into public.time_sessions (company_id, user_id) values ($1, $2)",
        [DEMO.belnex.companyId, WORKER],
      );
      expect(second).toBe(false);
    });
  });

  it("refuses clocking in on somebody else's behalf", async () => {
    await withRollback(async (db) => {
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      const created = await attemptWrite(
        db,
        "insert into public.time_sessions (company_id, user_id) values ($1, $2)",
        [DEMO.belnex.companyId, WORKER],
      );
      expect(created).toBe(false);
    });
  });

  it("lets the same person clock in again once the last one is closed", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await openSession(db, WORKER);
      await db.query("update public.time_sessions set ended_at = clock_timestamp() where id = $1", [rows[0].id]);

      const again = await attemptWrite(
        db,
        "insert into public.time_sessions (company_id, user_id) values ($1, $2)",
        [DEMO.belnex.companyId, WORKER],
      );
      expect(again).toBe(true);
    });
  });
});

describeIfDb("who can see a running clock", () => {
  it("is visible to the person it belongs to", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await openSession(db, WORKER);

      expect(await visibleCount(db, rows[0].id)).toBe(1);
    });
  });

  it("is visible to a manager, which is the point of a live view", async () => {
    await withRollback(async (db) => {
      await db.query("insert into public.time_sessions (company_id, user_id) values ($1, $2)", [DEMO.belnex.companyId, WORKER]);
      const { rows } = await db.query<{ id: string }>(
        "select id from public.time_sessions where user_id = $1 and ended_at is null",
        [WORKER],
      );
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await visibleCount(db, rows[0].id)).toBe(1);
    });
  });

  it("is not visible to a colleague", async () => {
    // Same company, no review rights. Where a person is working right now is
    // not general staff-room information.
    await withRollback(async (db) => {
      await db.query("insert into public.time_sessions (company_id, user_id) values ($1, $2)", [DEMO.belnex.companyId, WORKER]);
      const { rows } = await db.query<{ id: string }>(
        "select id from public.time_sessions where user_id = $1 and ended_at is null",
        [WORKER],
      );
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      expect(await visibleCount(db, rows[0].id)).toBe(0);
    });
  });

  it("is not visible to another company", async () => {
    await withRollback(async (db) => {
      await db.query("insert into public.time_sessions (company_id, user_id) values ($1, $2)", [DEMO.belnex.companyId, WORKER]);
      const { rows } = await db.query<{ id: string }>(
        "select id from public.time_sessions where user_id = $1 and ended_at is null",
        [WORKER],
      );
      await actAs(db, OUTSIDER);
      await assertRlsIsEnforced(db);

      expect(await visibleCount(db, rows[0].id)).toBe(0);
    });
  });
});

describeIfDb("closing the clock", () => {
  it("works for the person who started it", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await openSession(db, WORKER);

      const closed = await attemptWrite(db, "update public.time_sessions set ended_at = clock_timestamp() where id = $1", [rows[0].id]);
      expect(closed).toBe(true);
    });
  });

  it("refuses a colleague closing it", async () => {
    await withRollback(async (db) => {
      await db.query("insert into public.time_sessions (company_id, user_id) values ($1, $2)", [DEMO.belnex.companyId, WORKER]);
      const { rows } = await db.query<{ id: string }>(
        "select id from public.time_sessions where user_id = $1 and ended_at is null",
        [WORKER],
      );
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      await attemptWrite(db, "update public.time_sessions set ended_at = clock_timestamp() where id = $1", [rows[0].id]);
      // The policy filters rather than raising, so "did it throw" proves
      // nothing — what matters is that the row did not move.
      const { rows: after } = await db.query<{ ended_at: string | null }>(
        "select ended_at from public.time_sessions where id = $1",
        [rows[0].id],
      );
      expect(after[0]?.ended_at ?? null).toBeNull();
    });
  });

  it("refuses an end time in the future", async () => {
    // The only direction that pays. Everything else here allows correction.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await openSession(db, WORKER);

      const closed = await attemptWrite(
        db,
        "update public.time_sessions set ended_at = clock_timestamp() + interval '3 hours' where id = $1",
        [rows[0].id],
      );
      expect(closed).toBe(false);
    });
  });

  it("refuses moving the start time afterwards", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await openSession(db, WORKER);

      const moved = await attemptWrite(
        db,
        "update public.time_sessions set started_at = started_at - interval '5 hours' where id = $1",
        [rows[0].id],
      );
      expect(moved).toBe(false);
    });
  });

  it("refuses reopening a closed session", async () => {
    // Reopening would detach it from the timesheet entry it already produced,
    // and the same work would be counted twice.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await openSession(db, WORKER);
      await db.query("update public.time_sessions set ended_at = clock_timestamp() where id = $1", [rows[0].id]);

      const reopened = await attemptWrite(db, "update public.time_sessions set ended_at = null where id = $1", [rows[0].id]);
      expect(reopened).toBe(false);
    });
  });

  it("allows correcting the end downwards, for whoever forgot to stop", async () => {
    // Moving the end earlier only ever removes hours, so there is nothing to
    // defend against — and without it a forgotten clock becomes fourteen paid
    // hours the person cannot fix.
    await withRollback(async (db) => {
      // Seeded without a JWT so it can start in the past, the way a session
      // left running overnight actually would.
      await db.query(
        `insert into public.time_sessions (company_id, user_id, started_at)
         values ($1, $2, now() - interval '14 hours')`,
        [DEMO.belnex.companyId, WORKER],
      );
      const { rows } = await db.query<{ id: string }>(
        "select id from public.time_sessions where user_id = $1 and ended_at is null",
        [WORKER],
      );
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const corrected = await attemptWrite(
        db,
        "update public.time_sessions set ended_at = now() - interval '5 hours' where id = $1",
        [rows[0].id],
      );
      expect(corrected).toBe(true);
    });
  });
});
