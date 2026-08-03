import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, DEMO, withRollback } from "../helpers/db";

/**
 * Covers the second visibility mode from
 * docs/02-architecture/SCHEDULING_AND_DELEGATION.md section 3:
 *
 *   delegation        -> the contractor sees status only
 *   joining a project -> the contractor sees status AND people
 *
 * The whole GDPR argument rests on who acts. A subcontractor choosing to put
 * their people on someone else's project is explicit consent; a contractor
 * being able to browse a partner's workforce is not. These tests are where
 * that distinction is enforced rather than merely asserted in prose, so the
 * negative cases matter more than the positive one.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** GeoTech is a subcontractor of Belnex in the demo dataset. */
const GEOTECH = {
  companyId: "d0000001-0000-4000-8000-000000000003",
  assignedMembershipId: "d0000003-0000-4000-8000-000000000304",
  assignedName: "Dimitri Popescu",
  /** A colleague at the same company who is not on the project. */
  unassignedMembershipId: "d0000003-0000-4000-8000-000000000305",
} as const;

type Db = Parameters<Parameters<typeof withRollback>[0]>[0];

/**
 * Removes what the demo seed already put on this project, so these tests assert
 * against a state they set up themselves rather than one the seed can change
 * underneath them. Safe to run as the connection role: the whole transaction is
 * rolled back regardless.
 */
async function clearSeededCollaboration(db: Db) {
  await db.query("delete from public.project_partners where project_id = $1", [DEMO.belnex.projectId]);
  await db.query("delete from public.project_memberships where project_id = $1 and company_id = $2", [
    DEMO.belnex.projectId,
    GEOTECH.companyId,
  ]);
}

/** Puts a GeoTech person on Belnex's project, as GeoTech would. */
async function assignPartnerToProject(db: Db) {
  await clearSeededCollaboration(db);
  await db.query(
    `insert into public.project_memberships (company_id, project_id, company_membership_id, role)
     values ($1, $2, $3, 'member')`,
    [GEOTECH.companyId, DEMO.belnex.projectId, GEOTECH.assignedMembershipId],
  );
}

describeIfDb("a partner assigned to your project", () => {
  it("is visible by name, with the company they belong to", async () => {
    await withRollback(async (db) => {
      await assignPartnerToProject(db);
      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ person: string; company: string }>(
        `select u.name as person, c.name as company
         from public.company_memberships cm
         join public.users u on u.id = cm.user_id
         join public.companies c on c.id = cm.company_id
         where cm.id = $1`,
        [GEOTECH.assignedMembershipId],
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].person).toBe(GEOTECH.assignedName);
      // Showing the company is what keeps a partner's people from being
      // mistaken for your own.
      expect(rows[0].company).toContain("GEOTECH");
    });
  });

  it("does not expose the colleague who was not assigned", async () => {
    // The line between consent and a directory: assigning one person must not
    // open the rest of that company's workforce.
    await withRollback(async (db) => {
      await assignPartnerToProject(db);
      await actAs(db, DEMO.belnex.adminUserId);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.company_memberships where id = $1",
        [GEOTECH.unassignedMembershipId],
      );
      expect(rows[0].count).toBe("0");
    });
  });

  const stillPrivate = ["timesheet_entries", "employee_records", "team_memberships", "timesheets"] as const;

  for (const table of stillPrivate) {
    it(`does not expose the partner's ${table}`, async () => {
      await withRollback(async (db) => {
        await assignPartnerToProject(db);
        await actAs(db, DEMO.belnex.adminUserId);

        const { rows } = await db.query<{ count: string }>(
          `select count(*)::text as count from public.${table} where company_id = $1`,
          [GEOTECH.companyId],
        );
        expect(rows[0].count).toBe("0");
      });
    });
  }
});

describeIfDb("without a project assignment", () => {
  it("a partner's people stay invisible", async () => {
    // The baseline the tests above are measured against: a relationship alone
    // reveals that the company exists, never who works there.
    await withRollback(async (db) => {
      await clearSeededCollaboration(db);
      await actAs(db, DEMO.belnex.adminUserId);

      const company = await db.query<{ count: string }>(
        "select count(*)::text as count from public.companies where id = $1",
        [GEOTECH.companyId],
      );
      expect(company.rows[0].count).toBe("1");

      const members = await db.query<{ count: string }>(
        "select count(*)::text as count from public.company_memberships where company_id = $1",
        [GEOTECH.companyId],
      );
      expect(members.rows[0].count).toBe("0");
    });
  });
});
