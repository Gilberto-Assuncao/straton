import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Hours recorded against a subdivision (#77).
 *
 * The trigger under test does two jobs that look unrelated and are the same
 * rule from both ends.
 *
 * It *refuses the mismatch*: `site_area_id` comes from the caller, and nothing
 * in the policies compares it with the entry's location — so without this, a
 * day's work could be filed under a floor of somebody else's chantier.
 *
 * And it *answers the question when there is one answer*: a location with a
 * single subdivision fills itself in. That half is not a convenience. Without
 * it every entry stays null, the per-subdivision report is permanently empty,
 * and the table added two migrations ago never sees any traffic at all.
 *
 * The case that must NOT be filled in is asserted just as hard. A location with
 * two floors and nobody saying which stays null, because guessing would file
 * the day against a floor they may never have been on.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Aline Dubois — owner/admin of BELNEX. */
const ADMIN = DEMO.belnex.adminUserId;

/** Wide enough to cover the synthetic week these fixtures are written in. */
const FROM = "2000-01-01T00:00:00Z";
const TO = "2100-01-01T00:00:00Z";

type Db = Parameters<Parameters<typeof withRollback>[0]>[0];

async function createLocation(db: Db, name: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into public.sites (company_id, name, address, status) values ($1, $2, '{}'::jsonb, 'active') returning id",
    [DEMO.belnex.companyId, name],
  );
  return rows[0]!.id;
}

async function addArea(db: Db, siteId: string, name: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into public.site_areas (company_id, site_id, name) values ($1, $2, $3) returning id",
    [DEMO.belnex.companyId, siteId, name],
  );
  return rows[0]!.id;
}

/** A timesheet to hang entries on, for whoever is acting. */
async function createTimesheet(db: Db): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.timesheets (company_id, user_id, period_start, period_end)
     values ($1, $2, '2031-01-06', '2031-01-12') returning id`,
    [DEMO.belnex.companyId, ADMIN],
  );
  return rows[0]!.id;
}

async function addEntry(
  db: Db,
  timesheetId: string,
  siteId: string | null,
  siteAreaId: string | null,
): Promise<string | null> {
  const { rows } = await db.query<{ site_area_id: string | null }>(
    `insert into public.timesheet_entries
       (company_id, timesheet_id, site_id, site_area_id, starts_at, ends_at, break_minutes)
     values ($1, $2, $3, $4, '2031-01-07T08:00:00Z', '2031-01-07T16:00:00Z', 30)
     returning site_area_id`,
    [DEMO.belnex.companyId, timesheetId, siteId, siteAreaId],
  );
  return rows[0]!.site_area_id;
}

describeIfDb("hours against a subdivision", () => {
  it("cannot name a subdivision of a different location", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const here = await createLocation(db, "Mismatch A");
      const elsewhere = await createLocation(db, "Mismatch B");
      const areaElsewhere = await addArea(db, elsewhere, "1er étage");
      const timesheetId = await createTimesheet(db);

      // Both rows belong to this company and pass every policy. What refuses
      // it is the trigger comparing the subdivision's location with the
      // entry's — the check the policies cannot make.
      const accepted = await attemptWrite(
        db,
        `insert into public.timesheet_entries
           (company_id, timesheet_id, site_id, site_area_id, starts_at, ends_at, break_minutes)
         values ($1, $2, $3, $4, '2031-01-07T08:00:00Z', '2031-01-07T16:00:00Z', 0)`,
        [DEMO.belnex.companyId, timesheetId, here, areaElsewhere],
      );
      expect(accepted, "hours filed under another location's subdivision").toBe(false);
    });
  });

  it("cannot name a subdivision while claiming no location", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Orphan fixture");
      const areaId = await addArea(db, siteId, "Wiring");
      const timesheetId = await createTimesheet(db);

      // The same contradiction written with a null, and it has to be refused
      // for the same reason: the per-subdivision total is scoped by location,
      // so hours belonging to a floor of nowhere would be counted under a
      // chantier that never claimed them.
      const accepted = await attemptWrite(
        db,
        `insert into public.timesheet_entries
           (company_id, timesheet_id, site_id, site_area_id, starts_at, ends_at, break_minutes)
         values ($1, $2, null, $3, '2031-01-07T08:00:00Z', '2031-01-07T16:00:00Z', 0)`,
        [DEMO.belnex.companyId, timesheetId, areaId],
      );
      expect(accepted, "a subdivision on an entry with no location").toBe(false);
    });
  });

  it("is filled in when the location has only one", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      // Created with exactly one subdivision, by the trigger from #84. Nobody
      // was asked anything, and the entry still lands somewhere.
      const siteId = await createLocation(db, "Undivided fixture");
      const timesheetId = await createTimesheet(db);

      const areaId = await addEntry(db, timesheetId, siteId, null);
      expect(areaId, "the subdivision an undivided location owes its hours").not.toBeNull();

      const { rows } = await db.query<{ site_id: string }>(
        "select site_id from public.site_areas where id = $1",
        [areaId],
      );
      expect(rows[0]!.site_id, "and it belongs to this location").toBe(siteId);
    });
  });

  it("is left alone when the location has several and nobody said which", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Divided fixture");
      await addArea(db, siteId, "1er étage");
      const timesheetId = await createTimesheet(db);

      // The assertion that keeps the convenience honest. Two possible answers
      // and no answer given: filing it against either one would be the system
      // inventing a fact about where somebody spent their day.
      const areaId = await addEntry(db, timesheetId, siteId, null);
      expect(areaId, "a guess at which floor the work happened on").toBeNull();
    });
  });

  it("stays empty for hours with no location at all", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      // Office work, workshop time, travel. Real hours, no chantier — and
      // therefore no subdivision to reach for.
      const timesheetId = await createTimesheet(db);
      const areaId = await addEntry(db, timesheetId, null, null);
      expect(areaId).toBeNull();
    });
  });

  it("stops the subdivision being deleted once hours point at it", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Delete-guard fixture");
      const areaId = await addArea(db, siteId, "1er étage");
      const timesheetId = await createTimesheet(db);
      await addEntry(db, timesheetId, siteId, areaId);

      // `on delete restrict`, not `set null`. Detaching paid work from the
      // place it happened is not something a delete button should do quietly,
      // and the screen turns this into "close it instead".
      const accepted = await attemptWrite(db, "delete from public.site_areas where id = $1", [areaId]);
      expect(accepted, "deleting a subdivision that has hours against it").toBe(false);
    });
  });

  it("reports each subdivision separately, and keeps the unattributed hours", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const siteId = await createLocation(db, "Breakdown fixture");
      const areaId = await addArea(db, siteId, "1er étage");
      const timesheetId = await createTimesheet(db);

      await addEntry(db, timesheetId, siteId, areaId);
      // Two subdivisions now, so this one is not filled in — it is the
      // unattributed row the report must keep.
      await addEntry(db, timesheetId, siteId, null);

      const { rows } = await db.query<{ site_area_id: string | null; pending_minutes: string }>(
        "select site_area_id, pending_minutes from public.worked_hours_by_subdivision($1, $2, $3)",
        [FROM, TO, [siteId]],
      );

      expect(rows).toHaveLength(2);
      const named = rows.find((row) => row.site_area_id === areaId);
      const unattributed = rows.find((row) => row.site_area_id === null);
      // 08:00 to 16:00 less a 30 minute break.
      expect(Number(named?.pending_minutes), "the named subdivision's hours").toBe(450);
      // Kept, not dropped. Otherwise the parts would sum to less than the
      // location's own total with nothing on screen to explain the gap.
      expect(Number(unattributed?.pending_minutes), "the hours nobody attributed").toBe(450);
    });
  });

  it("cannot be used to read another company's hours", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      // Security invoker, like both neighbouring report functions: naming
      // somebody else's location returns nothing rather than their hours.
      const { rows } = await db.query(
        "select * from public.worked_hours_by_subdivision($1, $2, $3)",
        [FROM, TO, [DEMO.nordclean.siteId]],
      );
      expect(rows, "another company's location, broken down").toHaveLength(0);
    });
  });

  it("breaks down a chosen set of locations, and says which is which", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const first = await createLocation(db, "Set fixture A");
      const second = await createLocation(db, "Set fixture B");
      const timesheetId = await createTimesheet(db);
      await addEntry(db, timesheetId, first, null);
      await addEntry(db, timesheetId, second, null);

      const { rows } = await db.query<{ site_id: string; site_name: string }>(
        "select site_id, site_name from public.worked_hours_by_subdivision($1, $2, $3)",
        [FROM, TO, [first, second]],
      );

      // The location on every row is the point of carrying it. "1er étage" is
      // a name two chantiers can both have, and rows that did not say which
      // one they belonged to would be a breakdown nobody could act on.
      expect(rows.map((row) => row.site_id).sort(), "both locations in the set").toEqual([first, second].sort());
      expect(rows.every((row) => row.site_name.startsWith("Set fixture")), "each row naming its location").toBe(true);

      // Narrowing to one drops the other, rather than the filter being a
      // suggestion.
      const { rows: narrowed } = await db.query<{ site_id: string }>(
        "select site_id from public.worked_hours_by_subdivision($1, $2, $3)",
        [FROM, TO, [first]],
      );
      expect(narrowed.map((row) => row.site_id), "narrowed to one location").toEqual([first]);
    });
  });
});
