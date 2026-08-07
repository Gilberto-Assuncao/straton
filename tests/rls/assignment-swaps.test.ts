import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Swapping a shift with a colleague (#25).
 *
 * Two approvals in series, and the order is the whole design: the colleague
 * agrees first, the supervisor confirms second. Reverse them and someone finds
 * out on the day that they are working a Saturday they never accepted.
 *
 * The negative cases here earn their place. One of them caught a policy that
 * let anyone propose a swap for a shift that was never theirs — the same column
 * shadowing that made every company readable in migration 202608010001.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Pierre Dubois, on the "Cable routing" assignment. */
const PIERRE = { userId: DEMO.belnex.fieldUserId, membershipId: "d0000003-0000-4000-8000-000000000104" } as const;
/** Lena Vermeulen, on a different assignment. */
const LENA = { userId: "d0000002-0000-4000-8000-000000000106", membershipId: "d0000003-0000-4000-8000-000000000106" } as const;

/** Pierre's shift, from the demo seed. */
const PIERRES_SHIFT = "a0000001-0000-4000-8000-000000000002";
/** A shift neither Pierre nor Lena is on. */
const SOMEONE_ELSES_SHIFT = "a0000001-0000-4000-8000-000000000003";

const SWAP_ID = "b0000001-0000-4000-8000-0000000000f1";

/** Pierre asks Lena to take his shift. */
async function propose(db: Client): Promise<void> {
  await actAs(db, PIERRE.userId);
  await db.query(
    `insert into public.assignment_swaps (id, company_id, assignment_id, from_membership_id, to_membership_id, reason)
     values ($1, $2, $3, $4, $5, 'Medical appointment')`,
    [SWAP_ID, DEMO.belnex.companyId, PIERRES_SHIFT, PIERRE.membershipId, LENA.membershipId],
  );
}

function setStatus(db: Client, status: string) {
  return attemptWrite(db, "update public.assignment_swaps set status = $1 where id = $2", [status, SWAP_ID]);
}

describeIfDb("proposing a swap", () => {
  it("works for a shift you are on", async () => {
    await withRollback(async (db) => {
      await propose(db);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.assignment_swaps where id = $1",
        [SWAP_ID],
      );
      expect(rows[0].count).toBe("1");
    });
  });

  it("is refused for a shift that is not yours", async () => {
    // The regression this file exists for. The first version of the policy
    // compared a column against itself, so this passed — anyone could hand out
    // work that was never theirs.
    await withRollback(async (db) => {
      await actAs(db, LENA.userId);
      const wrote = await attemptWrite(
        db,
        `insert into public.assignment_swaps (company_id, assignment_id, from_membership_id, to_membership_id)
         values ($1, $2, $3, $4)`,
        [DEMO.belnex.companyId, SOMEONE_ELSES_SHIFT, LENA.membershipId, PIERRE.membershipId],
      );
      expect(wrote).toBe(false);
    });
  });

  it("is refused on someone else's behalf", async () => {
    await withRollback(async (db) => {
      await actAs(db, LENA.userId);
      const wrote = await attemptWrite(
        db,
        `insert into public.assignment_swaps (company_id, assignment_id, from_membership_id, to_membership_id)
         values ($1, $2, $3, $4)`,
        [DEMO.belnex.companyId, PIERRES_SHIFT, PIERRE.membershipId, LENA.membershipId],
      );
      expect(wrote).toBe(false);
    });
  });

  it("allows only one open proposal per shift", async () => {
    // Two live swaps on one shift could both be approved, and the second would
    // silently overwrite the first.
    await withRollback(async (db) => {
      await propose(db);
      const second = await attemptWrite(
        db,
        `insert into public.assignment_swaps (company_id, assignment_id, from_membership_id, to_membership_id)
         values ($1, $2, $3, $4)`,
        [DEMO.belnex.companyId, PIERRES_SHIFT, PIERRE.membershipId, "d0000003-0000-4000-8000-000000000105"],
      );
      expect(second).toBe(false);
    });
  });
});

describeIfDb("the order of the two approvals", () => {
  it("cannot be approved before the colleague accepts", async () => {
    // The centre of the design. Approving a swap nobody agreed to is how
    // someone finds out on the day.
    await withRollback(async (db) => {
      await propose(db);
      await actAs(db, DEMO.belnex.adminUserId);
      expect(await setStatus(db, "approved")).toBe(false);
    });
  });

  it("cannot be accepted by the person proposing it", async () => {
    await withRollback(async (db) => {
      await propose(db);
      expect(await setStatus(db, "accepted_by_peer")).toBe(false);
    });
  });

  it("is accepted by the colleague, then approved by a supervisor", async () => {
    await withRollback(async (db) => {
      await propose(db);

      await actAs(db, LENA.userId);
      expect(await setStatus(db, "accepted_by_peer")).toBe(true);

      await actAs(db, DEMO.belnex.adminUserId);
      expect(await setStatus(db, "approved")).toBe(true);
    });
  });

  it("cannot be approved by the colleague themselves", async () => {
    await withRollback(async (db) => {
      await propose(db);
      await actAs(db, LENA.userId);
      await setStatus(db, "accepted_by_peer");
      expect(await setStatus(db, "approved")).toBe(false);
    });
  });
});

describeIfDb("an approved swap", () => {
  it("actually moves the shift to the other person", async () => {
    // The point of the whole feature. An approved swap whose assignee never
    // moved would be worse than a refused one.
    await withRollback(async (db) => {
      await propose(db);
      await actAs(db, LENA.userId);
      await setStatus(db, "accepted_by_peer");
      await actAs(db, DEMO.belnex.adminUserId);
      await setStatus(db, "approved");

      await db.query("reset role");
      const { rows } = await db.query<{ membership: string }>(
        "select company_membership_id as membership from public.assignment_assignees where assignment_id = $1",
        [PIERRES_SHIFT],
      );
      const members = rows.map((row) => row.membership);
      expect(members).toContain(LENA.membershipId);
      expect(members).not.toContain(PIERRE.membershipId);
    });
  });

  it("cannot be re-pointed at another shift", async () => {
    await withRollback(async (db) => {
      await propose(db);
      const moved = await attemptWrite(db, "update public.assignment_swaps set assignment_id = $1 where id = $2", [
        SOMEONE_ELSES_SHIFT,
        SWAP_ID,
      ]);
      expect(moved).toBe(false);
    });
  });
});

describeIfDb("another company", () => {
  it("sees no swaps at all", async () => {
    await withRollback(async (db) => {
      await propose(db);
      await actAs(db, DEMO.nordclean.adminUserId);
      const { rows } = await db.query<{ count: string }>("select count(*)::text as count from public.assignment_swaps");
      expect(rows[0].count).toBe("0");
    });
  });
});
