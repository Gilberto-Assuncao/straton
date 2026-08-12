import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Subdivisions inside a work location (#77).
 *
 * Two things are under test, and they fail in opposite directions.
 *
 * The isolation half is the usual one: a subdivision belongs to a location,
 * and any rule that let you reach one without being allowed the other would be
 * a way through. The `company_id` on the row is supplied by the caller, which
 * is exactly the shape that has gone wrong here before — the policy only ever
 * checks the value you sent it, so the trigger has to check it against the
 * location's own.
 *
 * The other half is the invariant: every location keeps at least one
 * subdivision, so a report always has something to group by. That one is
 * enforced by a *deferred* constraint trigger, and the reason is `on delete
 * cascade` — deleting a location has to take its subdivisions with it without
 * tripping the guard. Both directions are asserted below, because getting this
 * wrong fails closed: deleting a work location would start refusing itself
 * with a message about subdivisions.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Aline Dubois — owner/admin of BELNEX. */
const ADMIN = DEMO.belnex.adminUserId;

type Db = Parameters<Parameters<typeof withRollback>[0]>[0];

/** A location of our own, so the assertions do not depend on seed contents. */
async function createLocation(db: Db, name: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into public.sites (company_id, name, address, status) values ($1, $2, '{}'::jsonb, 'active') returning id",
    [DEMO.belnex.companyId, name],
  );
  return rows[0]!.id;
}

/**
 * Runs `fn`, then forces the deferred constraints to fire, and reports whether
 * the pair was refused.
 *
 * `set constraints all immediate` is what stands in for the commit these tests
 * never reach — every case here runs inside a transaction that is rolled back,
 * so a check deferred to commit would otherwise never run at all and the test
 * would pass by never asking the question.
 */
async function refusedAtCommit(db: Db, fn: (db: Db) => Promise<void>): Promise<boolean> {
  await db.query("savepoint deferred_check");
  try {
    await fn(db);
    await db.query("set constraints all immediate");
    await db.query("release savepoint deferred_check");
    return false;
  } catch {
    await db.query("rollback to savepoint deferred_check");
    return true;
  }
}

describeIfDb("subdivisions of a work location", () => {
  it("are not visible to another company", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ count: string }>(
        "select count(*) as count from public.site_areas where site_id = $1",
        [DEMO.nordclean.siteId],
      );
      expect(Number(rows[0]!.count), "another company's subdivisions").toBe(0);
    });
  });

  it("cannot be added to another company's location", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      // Note the `company_id`: our own, which is what makes the insert policy
      // accept it. The location is somebody else's, and that is what the
      // trigger is for — the policy never looks at the location at all.
      const accepted = await attemptWrite(
        db,
        "insert into public.site_areas (company_id, site_id, name) values ($1, $2, 'Wedged in')",
        [DEMO.belnex.companyId, DEMO.nordclean.siteId],
      );
      expect(accepted, "a subdivision inserted against another company's location").toBe(false);

      const { rows } = await db.query<{ count: string }>(
        "select count(*) as count from public.site_areas where name = 'Wedged in'",
      );
      expect(Number(rows[0]!.count)).toBe(0);
    });
  });

  it("are created with the location, without anybody asking", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Subdivision fixture");
      const { rows } = await db.query<{ count: string }>(
        "select count(*) as count from public.site_areas where site_id = $1",
        [siteId],
      );
      expect(Number(rows[0]!.count), "the subdivision the trigger owes every new location").toBe(1);
    });
  });

  it("cannot all be deleted, leaving the location with nothing to group by", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Emptying fixture");

      const refused = await refusedAtCommit(db, async () => {
        await db.query("delete from public.site_areas where site_id = $1", [siteId]);
      });
      expect(refused, "emptying a location of its subdivisions").toBe(true);

      const { rows } = await db.query<{ count: string }>(
        "select count(*) as count from public.site_areas where site_id = $1",
        [siteId],
      );
      expect(Number(rows[0]!.count), "what survived the refusal").toBe(1);
    });
  });

  it("may be replaced in one go, which is not the same as emptying", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Replacement fixture");

      // The case an immediate check would have refused for no reason: at no
      // single moment inside the transaction does the rule hold, and at the
      // end it does.
      const refused = await refusedAtCommit(db, async () => {
        await db.query("delete from public.site_areas where site_id = $1", [siteId]);
        await db.query(
          "insert into public.site_areas (company_id, site_id, name) values ($1, $2, '1er étage')",
          [DEMO.belnex.companyId, siteId],
        );
      });
      expect(refused, "swapping the only subdivision for a named one").toBe(false);
    });
  });

  it("do not stop the location itself from being deleted", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Cascade fixture");

      // The whole reason the guard is deferred. `on delete cascade` empties
      // the location of its subdivisions on the way out, which is not somebody
      // emptying a location that is staying — and a guard that could not tell
      // the two apart would make deleting a work location impossible, with an
      // error message about subdivisions.
      const refused = await refusedAtCommit(db, async () => {
        await db.query("delete from public.sites where id = $1", [siteId]);
      });
      expect(refused, "deleting a work location with its subdivisions attached").toBe(false);

      const { rows } = await db.query<{ count: string }>(
        "select count(*) as count from public.site_areas where site_id = $1",
        [siteId],
      );
      expect(Number(rows[0]!.count), "subdivisions left behind by the cascade").toBe(0);
    });
  });
});
