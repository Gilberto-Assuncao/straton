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
 * Runs `fn` and reports whether it was refused, **and why**.
 *
 * The reason is the point. The first version of this helper swallowed the
 * exception and returned a bare boolean, so when CI caught the cascade bug on
 * this branch the failure read "expected true to be false" and named neither
 * the constraint nor the message — leaving the next person to work out from
 * scratch which of several candidates had fired.
 */
async function attempt(db: Db, fn: (db: Db) => Promise<unknown>): Promise<{ refused: boolean; reason: string }> {
  await db.query("savepoint attempt");
  try {
    await fn(db);
    await db.query("release savepoint attempt");
    return { refused: false, reason: "" };
  } catch (error) {
    await db.query("rollback to savepoint attempt");
    return { refused: true, reason: error instanceof Error ? error.message : String(error) };
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

      const outcome = await attempt(db, () =>
        db.query("delete from public.site_areas where site_id = $1", [siteId]),
      );
      expect(outcome.refused, `emptying a location of its subdivisions — ${outcome.reason}`).toBe(true);
      expect(outcome.reason, "and it says which rule stopped it").toContain("at least one subdivision");

      const { rows } = await db.query<{ count: string }>(
        "select count(*) as count from public.site_areas where site_id = $1",
        [siteId],
      );
      expect(Number(rows[0]!.count), "what survived the refusal").toBe(1);
    });
  });

  it("cannot be emptied one row at a time either", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Two-step fixture");
      const second = await db.query<{ id: string }>(
        "insert into public.site_areas (company_id, site_id, name) values ($1, $2, '1er étage') returning id",
        [DEMO.belnex.companyId, siteId],
      );

      // Deleting one of two is fine — that is the ordinary case the screen
      // offers. It is the *last* one that has to be refused, and a guard that
      // only looked at the statement rather than at what would survive it
      // would let two deletes do what one cannot.
      const first = await attempt(db, () =>
        db.query("delete from public.site_areas where id = $1", [second.rows[0]!.id]),
      );
      expect(first.refused, `removing one subdivision of two — ${first.reason}`).toBe(false);

      const last = await attempt(db, () =>
        db.query("delete from public.site_areas where site_id = $1", [siteId]),
      );
      expect(last.refused, `removing the one that was left — ${last.reason}`).toBe(true);
    });
  });

  it("do not stop the location itself from being deleted", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Cascade fixture");

      /*
       * The case that broke the first version of this guard, caught here.
       *
       * `on delete cascade` empties the location of its subdivisions on the way
       * out, which is not somebody emptying a location that is staying. The
       * deferred trigger could not tell the two apart — it looked for the
       * parent row and still found it — so deleting a work location started
       * refusing itself with a message about subdivisions. The guard now asks
       * `pg_trigger_depth()` instead, and this is the assertion that says so.
       */
      const outcome = await attempt(db, () =>
        db.query("delete from public.sites where id = $1", [siteId]),
      );
      expect(
        outcome.refused,
        `deleting a work location with its subdivisions attached — ${outcome.reason}`,
      ).toBe(false);

      const { rows } = await db.query<{ count: string }>(
        "select count(*) as count from public.site_areas where site_id = $1",
        [siteId],
      );
      expect(Number(rows[0]!.count), "subdivisions left behind by the cascade").toBe(0);
    });
  });
});
