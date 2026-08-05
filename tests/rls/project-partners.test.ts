import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * The invitation handshake from migration 202608010004.
 *
 * Access here is granted by an act of the *partner* — accepting — not by the
 * owner inviting. These tests exist to keep that direction from quietly
 * reversing: an owner who could accept on the partner's behalf would be able to
 * pull any company they have a relationship with into any project, and the
 * consent argument the whole delegation model rests on would be gone.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const GEOTECH = {
  companyId: "d0000001-0000-4000-8000-000000000003",
  adminUserId: "d0000002-0000-4000-8000-000000000301",
  membershipId: "d0000003-0000-4000-8000-000000000304",
} as const;

/**
 * Clears whatever the demo seed put on this project, so each test starts from a
 * known state rather than from whoever the seed happened to invite. Runs before
 * actAs, as the connection role — this is fixture setup, not something under
 * test, and the surrounding transaction is rolled back either way.
 */
async function clearSeededPartners(db: Client): Promise<void> {
  await db.query("delete from public.project_partners where project_id = $1", [DEMO.belnex.projectId]);
  await db.query(
    "delete from public.project_memberships where project_id = $1 and company_id = $2",
    [DEMO.belnex.projectId, GEOTECH.companyId],
  );
}

/** Invites GeoTech onto Belnex's project, acting as the Belnex admin. */
async function invite(db: Client): Promise<void> {
  await clearSeededPartners(db);
  await actAs(db, DEMO.belnex.adminUserId);
  await db.query(
    `insert into public.project_partners (project_id, company_id, owner_company_id, invited_by)
     values ($1, $2, $3, $4)`,
    [DEMO.belnex.projectId, GEOTECH.companyId, DEMO.belnex.companyId, DEMO.belnex.adminUserId],
  );
}

/** Puts one of GeoTech's people on the project, acting as GeoTech. */
function assignSelf(db: Client) {
  return attemptWrite(
    db,
    `insert into public.project_memberships (company_id, project_id, company_membership_id, role)
     values ($1, $2, $3, 'member')`,
    [GEOTECH.companyId, DEMO.belnex.projectId, GEOTECH.membershipId],
  );
}

async function countVisible(db: Client, table: string, where: string, params: unknown[]): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `select count(*)::text as count from public.${table} where ${where}`,
    params,
  );
  return Number(rows[0].count);
}

describeIfDb("before any invitation", () => {
  it("the project is invisible to the other company", async () => {
    await withRollback(async (db) => {
      await clearSeededPartners(db);
      await actAs(db, GEOTECH.adminUserId);
      await assertRlsIsEnforced(db);
      expect(await countVisible(db, "projects", "id = $1", [DEMO.belnex.projectId])).toBe(0);
    });
  });

  it("that company cannot put itself on the project", async () => {
    // The gap this closes: the old insert policy checked only that the row
    // carried your own company_id, and never that the project was any of your
    // business.
    await withRollback(async (db) => {
      await clearSeededPartners(db);
      await actAs(db, GEOTECH.adminUserId);
      expect(await assignSelf(db)).toBe(false);
    });
  });
});

describeIfDb("an invitation not yet answered", () => {
  it("reveals the project, so the answer is not blind", async () => {
    await withRollback(async (db) => {
      await invite(db);
      await actAs(db, GEOTECH.adminUserId);
      expect(await countVisible(db, "projects", "id = $1", [DEMO.belnex.projectId])).toBe(1);
    });
  });

  it("reveals nothing else — not the sites, not the people", async () => {
    await withRollback(async (db) => {
      await invite(db);
      await actAs(db, GEOTECH.adminUserId);
      expect(await countVisible(db, "sites", "project_id = $1", [DEMO.belnex.projectId])).toBe(0);
      expect(await assignSelf(db)).toBe(false);
    });
  });

  it("cannot be accepted by the company that sent it", async () => {
    // The centre of the whole design. If this ever passes, access stops being
    // something the partner agreed to.
    await withRollback(async (db) => {
      await invite(db);
      const accepted = await attemptWrite(
        db,
        "update public.project_partners set status = 'accepted' where project_id = $1 and company_id = $2",
        [DEMO.belnex.projectId, GEOTECH.companyId],
      );
      expect(accepted).toBe(false);
    });
  });

  it("cannot be created on a project you do not own", async () => {
    await withRollback(async (db) => {
      await clearSeededPartners(db);
      await actAs(db, DEMO.belnex.adminUserId);
      const forged = await attemptWrite(
        db,
        `insert into public.project_partners (project_id, company_id, owner_company_id)
         values ($1, $2, $3)`,
        [DEMO.nordclean.projectId, GEOTECH.companyId, DEMO.belnex.companyId],
      );
      expect(forged).toBe(false);
    });
  });

  it("names the company that sent it", async () => {
    // An invitation rendered without the sender's name is worse than none.
    await withRollback(async (db) => {
      await invite(db);
      await actAs(db, GEOTECH.adminUserId);
      const { rows } = await db.query<{ name: string }>(
        `select c.name from public.project_partners pp
         join public.companies c on c.id = pp.owner_company_id
         where pp.company_id = $1`,
        [GEOTECH.companyId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].name).not.toBe("");
    });
  });

  it("is invisible to a company that is not part of it", async () => {
    await withRollback(async (db) => {
      await invite(db);
      await actAs(db, DEMO.nordclean.adminUserId);
      expect(await countVisible(db, "project_partners", "project_id = $1", [DEMO.belnex.projectId])).toBe(0);
      expect(await countVisible(db, "projects", "id = $1", [DEMO.belnex.projectId])).toBe(0);
    });
  });
});

describeIfDb("an accepted invitation", () => {
  /** Runs the full handshake and leaves the connection acting as GeoTech. */
  async function acceptedHandshake(db: Client): Promise<void> {
    await invite(db);
    await actAs(db, GEOTECH.adminUserId);
    await db.query("update public.project_partners set status = 'accepted' where project_id = $1 and company_id = $2", [
      DEMO.belnex.projectId,
      GEOTECH.companyId,
    ]);
  }

  it("opens the project's sites", async () => {
    await withRollback(async (db) => {
      await acceptedHandshake(db);
      expect(await countVisible(db, "sites", "project_id = $1", [DEMO.belnex.projectId])).toBeGreaterThan(0);
    });
  });

  it("lets the partner put their own people on the project", async () => {
    await withRollback(async (db) => {
      await acceptedHandshake(db);
      expect(await assignSelf(db)).toBe(true);
    });
  });

  it("does not open the owner's hours or workforce", async () => {
    // Joining a project is not joining the company. Everything below stays shut
    // no matter how far the handshake has gone.
    await withRollback(async (db) => {
      await acceptedHandshake(db);
      expect(await countVisible(db, "timesheet_entries", "company_id = $1", [DEMO.belnex.companyId])).toBe(0);
      expect(await countVisible(db, "company_memberships", "company_id = $1", [DEMO.belnex.companyId])).toBe(0);
      expect(await countVisible(db, "employee_records", "company_id = $1", [DEMO.belnex.companyId])).toBe(0);
    });
  });

  it("cannot be answered twice", async () => {
    await withRollback(async (db) => {
      await acceptedHandshake(db);
      const reversed = await attemptWrite(
        db,
        "update public.project_partners set status = 'declined' where project_id = $1 and company_id = $2",
        [DEMO.belnex.projectId, GEOTECH.companyId],
      );
      expect(reversed).toBe(false);
    });
  });

  it("cannot be re-pointed at another project", async () => {
    // Otherwise an accepted answer could be laundered into access somewhere the
    // partner never agreed to.
    await withRollback(async (db) => {
      await acceptedHandshake(db);
      const moved = await attemptWrite(
        db,
        "update public.project_partners set project_id = $1 where project_id = $2 and company_id = $3",
        [DEMO.nordclean.projectId, DEMO.belnex.projectId, GEOTECH.companyId],
      );
      expect(moved).toBe(false);
    });
  });

  it("can be revoked by the owner", async () => {
    await withRollback(async (db) => {
      await acceptedHandshake(db);
      await actAs(db, DEMO.belnex.adminUserId);
      await db.query("update public.project_partners set status = 'revoked' where project_id = $1 and company_id = $2", [
        DEMO.belnex.projectId,
        GEOTECH.companyId,
      ]);

      await actAs(db, GEOTECH.adminUserId);
      expect(await countVisible(db, "projects", "id = $1", [DEMO.belnex.projectId])).toBe(0);
      expect(await countVisible(db, "sites", "project_id = $1", [DEMO.belnex.projectId])).toBe(0);
      expect(await assignSelf(db)).toBe(false);
    });
  });
});
