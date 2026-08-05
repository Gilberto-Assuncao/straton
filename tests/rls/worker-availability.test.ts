import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Who may declare an absence, and who may see it (#24).
 *
 * The rule is narrow on purpose: you declare your own, a manager declares
 * anyone's in their company, and nobody outside the company sees any of it.
 * Absences are close to health data — "sick" with a note is exactly that — so
 * the negative cases here are the ones that matter.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Pierre Dubois: a field worker at Belnex with no management role. */
const WORKER = {
  userId: DEMO.belnex.fieldUserId,
  membershipId: "d0000003-0000-4000-8000-000000000104",
} as const;

/** A colleague at the same company. */
const COLLEAGUE_MEMBERSHIP_ID = "d0000003-0000-4000-8000-000000000106";

const WINDOW = {
  start: "2026-12-01T00:00:00Z",
  end: "2026-12-15T00:00:00Z",
  /** Overlaps the window above. */
  overlappingStart: "2026-12-10T00:00:00Z",
  overlappingEnd: "2026-12-20T00:00:00Z",
} as const;

function declare(
  db: Client,
  membershipId: string,
  start: string,
  end: string,
  kind: "unavailable" | "available" = "unavailable",
) {
  return attemptWrite(
    db,
    `insert into public.worker_availability (company_id, company_membership_id, starts_at, ends_at, kind, reason)
     values ($1, $2, $3, $4, $5, $6)`,
    [DEMO.belnex.companyId, membershipId, start, end, kind, kind === "unavailable" ? "holiday" : null],
  );
}

describeIfDb("declaring an absence", () => {
  it("a worker may declare their own", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      await assertRlsIsEnforced(db);
      expect(await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end)).toBe(true);
    });
  });

  it("a worker may not declare a colleague's", async () => {
    // Otherwise anyone could book a colleague out of next week's schedule.
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      expect(await declare(db, COLLEAGUE_MEMBERSHIP_ID, WINDOW.start, WINDOW.end)).toBe(false);
    });
  });

  it("a manager may declare anyone's in their company", async () => {
    // Sick leave arrives by phone at 6am and is entered by whoever answered.
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      expect(await declare(db, COLLEAGUE_MEMBERSHIP_ID, WINDOW.start, WINDOW.end)).toBe(true);
    });
  });

  it("nobody may declare one for another company's worker", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.nordclean.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.worker_availability (company_id, company_membership_id, starts_at, ends_at, kind, reason)
         values ($1, $2, $3, $4, 'unavailable', 'holiday')`,
        [DEMO.belnex.companyId, WORKER.membershipId, WINDOW.start, WINDOW.end],
      );
      expect(wrote).toBe(false);
    });
  });
});

describeIfDb("two declarations that collide", () => {
  it("refuses an overlap of the same kind", async () => {
    // Two overlapping absences are not two facts; they are one fact entered
    // twice, and they make "is this person free?" depend on which row is read.
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      expect(await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end)).toBe(true);
      expect(await declare(db, WORKER.membershipId, WINDOW.overlappingStart, WINDOW.overlappingEnd)).toBe(false);
    });
  });

  it("allows an overlap of opposite kinds, which precedence then settles", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      expect(await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end, "unavailable")).toBe(true);
      expect(await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end, "available")).toBe(true);
    });
  });

  it("refuses a range that ends before it starts", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      expect(await declare(db, WORKER.membershipId, WINDOW.end, WINDOW.start)).toBe(false);
    });
  });
});

describeIfDb("who can see an absence", () => {
  it("stays inside the company", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end);

      await actAs(db, DEMO.nordclean.adminUserId);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.worker_availability where company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(rows[0].count).toBe("0");
    });
  });

  it("is not leaked by the conflicts function either", async () => {
    // The function is security invoker precisely so it cannot become a side
    // door around the policy above. This is what proves it.
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end);

      await actAs(db, DEMO.nordclean.adminUserId);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.availability_conflicts($1, $2, $3)",
        [[WORKER.membershipId], WINDOW.start, WINDOW.end],
      );
      expect(rows[0].count).toBe("0");
    });
  });

  it("is visible to colleagues, because scheduling depends on it", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end);

      await actAs(db, DEMO.belnex.adminUserId);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.availability_conflicts($1, $2, $3)",
        [[WORKER.membershipId], WINDOW.start, WINDOW.end],
      );
      expect(rows[0].count).toBe("1");
    });
  });

  it("reports a declared availability as free, not as a conflict", async () => {
    // The function answers "who is not free?" — a positive declaration is the
    // opposite of that, and counting it would block the very days someone
    // offered to work.
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end, "available");

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.availability_conflicts($1, $2, $3)",
        [[WORKER.membershipId], WINDOW.start, WINDOW.end],
      );
      expect(rows[0].count).toBe("0");
    });
  });

  it("finds nothing in a window that does not touch the absence", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER.userId);
      await declare(db, WORKER.membershipId, WINDOW.start, WINDOW.end);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.availability_conflicts($1, $2, $3)",
        [[WORKER.membershipId], "2027-03-01T00:00:00Z", "2027-03-05T00:00:00Z"],
      );
      expect(rows[0].count).toBe("0");
    });
  });
});
