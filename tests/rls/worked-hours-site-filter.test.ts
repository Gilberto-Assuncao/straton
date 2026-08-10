import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, DEMO, withRollback } from "../helpers/db";

/**
 * The worked-hours report over a chosen set of work locations (#77).
 *
 * The manager asked to be able to see every location, or only some. That makes
 * the filter a parameter the caller controls, and a parameter the caller
 * controls is the shape that has gone wrong here before: the #65 sweep was
 * mostly about places where what you could ask for decided what you could see.
 *
 * So the invariant under test is not "the filter works". It is that the filter
 * can only ever **narrow** what RLS already allowed. Naming another company's
 * location must return nothing — not that company's hours.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Aline Dubois — owner/admin of BELNEX. */
const ADMIN = DEMO.belnex.adminUserId;

/** Wide enough to cover whatever the seed put in the fixtures. */
const FROM = "2000-01-01T00:00:00Z";
const TO = "2100-01-01T00:00:00Z";

interface SiteTotals {
  site_id: string | null;
  approved_minutes: string;
  pending_minutes: string;
}

async function bySite(
  db: Parameters<Parameters<typeof withRollback>[0]>[0],
  siteIds: string[] | null,
): Promise<SiteTotals[]> {
  const { rows } = await db.query<SiteTotals>(
    "select site_id, approved_minutes, pending_minutes from public.worked_hours_by_site($1, $2, $3)",
    [FROM, TO, siteIds],
  );
  return rows;
}

describeIfDb("worked_hours_by_site, filtered by location", () => {
  it("cannot be widened to another company's location", async () => {
    // The whole safety argument in one case. NORDCLEAN's site id is a perfectly
    // valid uuid and the parser lets it through on purpose; what stops it is
    // that the function is security invoker and RLS never offers those rows.
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const rows = await bySite(db, [DEMO.nordclean.siteId]);
      expect(rows.map((row) => row.site_id)).not.toContain(DEMO.nordclean.siteId);
      // Not merely "no NORDCLEAN row" — no hours at all, from any row.
      const minutes = rows.reduce(
        (sum, row) => sum + Number(row.approved_minutes) + Number(row.pending_minutes),
        0,
      );
      expect(minutes, "hours reachable by naming another company's location").toBe(0);
    });
  });

  it("narrows rather than changes the numbers", async () => {
    // A filtered figure has to be a subset of the unfiltered one. If narrowing
    // could ever raise a total, the two would be answering different questions
    // and the month-end number would depend on which screen you opened.
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const all = await bySite(db, null);
      const own = all.find((row) => row.site_id === DEMO.belnex.siteId);
      const filtered = await bySite(db, [DEMO.belnex.siteId]);

      expect(filtered.every((row) => row.site_id === DEMO.belnex.siteId)).toBe(true);
      if (own) {
        expect(filtered).toHaveLength(1);
        // Same location, same figure, filtered or not.
        expect(filtered[0].approved_minutes).toBe(own.approved_minutes);
      } else {
        expect(filtered).toHaveLength(0);
      }
    });
  });

  it("treats an empty array as no filter", async () => {
    // A multi-select that has been cleared must show the whole company, not an
    // empty report. Empty and null have to mean the same thing here, because
    // the UI produces one and the absence of the parameter produces the other.
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      expect(await bySite(db, [])).toEqual(await bySite(db, null));
    });
  });

  it("keeps the person and location halves describing the same entries", async () => {
    // Both functions carry the same predicate. If they drifted apart, the
    // per-person table and the per-location table on one screen would total
    // differently and there would be no way to tell which was right.
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const sites = await bySite(db, [DEMO.belnex.siteId]);
      const { rows: people } = await db.query<{ approved_minutes: string }>(
        "select approved_minutes from public.worked_hours_by_person($1, $2, $3)",
        [FROM, TO, [DEMO.belnex.siteId]],
      );

      const siteApproved = sites.reduce((sum, row) => sum + Number(row.approved_minutes), 0);
      const personApproved = people.reduce((sum, row) => sum + Number(row.approved_minutes), 0);
      expect(personApproved).toBe(siteApproved);
    });
  });
});
