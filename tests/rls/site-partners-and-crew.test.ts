import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Partners and crew allocated to a work location (#77).
 *
 * "Equipes e parceiros pertencem à empresa, ela apenas aloca eles nos chantier"
 *
 * The handshake is the same one migration 202608010004 built for projects, and
 * these tests exist for the same reason: access is granted by an act of the
 * *partner* — accepting — and never by the owner inviting. An owner who could
 * accept on the partner's behalf would be able to pull any company they have a
 * relationship with onto any chantier, and the consent the whole delegation
 * model rests on would be gone.
 *
 * The crew half carries a boundary of its own, and it is the one #83 spent its
 * entire design defending: a company allocates **its own** people. The general
 * contractor says which companies are on the job; each company says which of
 * its people are. A screen — or a policy — that let the contractor place a
 * subcontractor's staff would have to know that staff list to do it.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const GEOTECH = {
  companyId: "d0000001-0000-4000-8000-000000000003",
  adminUserId: "d0000002-0000-4000-8000-000000000301",
  membershipId: "d0000003-0000-4000-8000-000000000304",
} as const;

/** A Belnex employee, to test the owner allocating their own. */
const BELNEX_MEMBERSHIP = "d0000003-0000-4000-8000-000000000101";

const SITE = DEMO.belnex.siteId;

/**
 * Clears whatever the seed's backfill put on this location, so each case starts
 * from a known state rather than from whoever the demo data happened to invite.
 * Runs before actAs, as the connection role — fixture setup, not something
 * under test, and the surrounding transaction is rolled back either way.
 */
async function clearSeeded(db: Client): Promise<void> {
  await db.query("delete from public.site_partners where site_id = $1", [SITE]);
  await db.query("delete from public.site_crew where site_id = $1", [SITE]);
}

/** Invites GeoTech onto Belnex's location, acting as the Belnex admin. */
async function invite(db: Client): Promise<void> {
  await clearSeeded(db);
  await actAs(db, DEMO.belnex.adminUserId);
  await db.query(
    `insert into public.site_partners (site_id, company_id, owner_company_id, invited_by)
     values ($1, $2, $3, $4)`,
    [SITE, GEOTECH.companyId, DEMO.belnex.companyId, DEMO.belnex.adminUserId],
  );
}

/** Puts one of GeoTech's own people on the location, acting as GeoTech. */
function allocateSelf(db: Client) {
  return attemptWrite(
    db,
    `insert into public.site_crew (company_id, site_id, company_membership_id, role)
     values ($1, $2, $3, 'member')`,
    [GEOTECH.companyId, SITE, GEOTECH.membershipId],
  );
}

async function countVisible(db: Client, table: string, where: string, params: unknown[]): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    `select count(*)::text as count from public.${table} where ${where}`,
    params,
  );
  return Number(rows[0]!.count);
}

describeIfDb("a partner company on a work location", () => {
  it("gains nothing until it accepts", async () => {
    await withRollback(async (db) => {
      await invite(db);

      // GeoTech has been invited and has not answered. The location must not be
      // readable yet: an invitation is an offer, and treating it as access
      // would make the accept button decorative.
      await actAs(db, GEOTECH.adminUserId);
      await assertRlsIsEnforced(db);
      expect(await countVisible(db, "sites", "id = $1", [SITE]), "the location, before accepting").toBe(0);
      expect(await countVisible(db, "site_areas", "site_id = $1", [SITE]), "its subdivisions, before accepting").toBe(0);
    });
  });

  it("sees the location and its subdivisions once it accepts", async () => {
    await withRollback(async (db) => {
      await invite(db);

      await actAs(db, GEOTECH.adminUserId);
      await assertRlsIsEnforced(db);
      await db.query("update public.site_partners set status = 'accepted' where site_id = $1 and company_id = $2", [
        SITE,
        GEOTECH.companyId,
      ]);

      expect(await countVisible(db, "sites", "id = $1", [SITE]), "the location, after accepting").toBe(1);
      // The subdivisions follow the location exactly. Any rule that differed
      // would be a way to reach through one to the other.
      expect(
        await countVisible(db, "site_areas", "site_id = $1", [SITE]),
        "its subdivisions, after accepting",
      ).toBeGreaterThan(0);
    });
  });

  it("cannot be accepted by the company that sent the invitation", async () => {
    await withRollback(async (db) => {
      await invite(db);
      await assertRlsIsEnforced(db);

      // Still acting as Belnex, who invited. This is the direction the whole
      // model rests on: consent is the partner's to give.
      const accepted = await attemptWrite(
        db,
        "update public.site_partners set status = 'accepted' where site_id = $1 and company_id = $2",
        [SITE, GEOTECH.companyId],
      );
      expect(accepted, "the inviting company accepting on the partner's behalf").toBe(false);
    });
  });

  it("cannot be invited onto somebody else's location", async () => {
    await withRollback(async (db) => {
      await clearSeeded(db);
      await actAs(db, GEOTECH.adminUserId);
      await assertRlsIsEnforced(db);

      // `owner_company_id` is a value the caller sends, and the policy checks it
      // against the location rather than trusting it — otherwise anybody could
      // forge an invitation onto a chantier they have nothing to do with.
      const accepted = await attemptWrite(
        db,
        `insert into public.site_partners (site_id, company_id, owner_company_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.nordclean.companyId, GEOTECH.companyId],
      );
      expect(accepted, "an invitation forged onto another company's location").toBe(false);
    });
  });
});

describeIfDb("crew allocated to a work location", () => {
  it("can be allocated by their own company once it has accepted", async () => {
    await withRollback(async (db) => {
      await invite(db);

      await actAs(db, GEOTECH.adminUserId);
      await assertRlsIsEnforced(db);
      await db.query("update public.site_partners set status = 'accepted' where site_id = $1 and company_id = $2", [
        SITE,
        GEOTECH.companyId,
      ]);

      expect(await allocateSelf(db), "a partner allocating their own person after accepting").toBe(true);
    });
  });

  it("cannot be allocated onto a location the company has not accepted", async () => {
    await withRollback(async (db) => {
      await invite(db);

      // Invited, not answered. Allocating people would be helping yourself to
      // the access the accept step exists to grant.
      await actAs(db, GEOTECH.adminUserId);
      await assertRlsIsEnforced(db);
      expect(await allocateSelf(db), "a partner allocating people before accepting").toBe(false);
    });
  });

  it("cannot be another company's people, even for the location's owner", async () => {
    await withRollback(async (db) => {
      await invite(db);
      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);
      await db.query("update public.site_partners set status = 'accepted' where site_id = $1 and company_id = $2", [
        SITE,
        GEOTECH.companyId,
      ]);

      /*
       * The boundary. Belnex owns this chantier and has invited GeoTech onto
       * it, and still may not place GeoTech's staff — because doing so requires
       * knowing who GeoTech's staff are, which is the thing the general
       * contractor is not entitled to. #83 made the same call about who
       * receives notifications, and it has to hold here or the two disagree.
       *
       * Note the row claims Belnex's own company_id while naming a GeoTech
       * membership: that is the shape that gets past a policy which only checks
       * the value it was handed. The trigger compares it with the membership.
       */
      const forged = await attemptWrite(
        db,
        `insert into public.site_crew (company_id, site_id, company_membership_id, role)
         values ($1, $2, $3, 'member')`,
        [DEMO.belnex.companyId, SITE, GEOTECH.membershipId],
      );
      expect(forged, "the location's owner placing a partner's employee").toBe(false);
    });
  });

  it("is allocated by the owner for the owner's own people", async () => {
    await withRollback(async (db) => {
      await clearSeeded(db);
      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);

      expect(
        await attemptWrite(
          db,
          `insert into public.site_crew (company_id, site_id, company_membership_id, role)
           values ($1, $2, $3, 'member')`,
          [DEMO.belnex.companyId, SITE, BELNEX_MEMBERSHIP],
        ),
        "a company allocating its own employee to its own location",
      ).toBe(true);
    });
  });

  it("is invisible to a company with nothing to do with the location", async () => {
    await withRollback(async (db) => {
      await clearSeeded(db);
      await actAs(db, DEMO.belnex.adminUserId);
      await db.query(
        `insert into public.site_crew (company_id, site_id, company_membership_id, role)
         values ($1, $2, $3, 'member')`,
        [DEMO.belnex.companyId, SITE, BELNEX_MEMBERSHIP],
      );

      // NORDCLEAN was never invited here. Who is standing on somebody else's
      // chantier is not theirs to read.
      await actAs(db, DEMO.nordclean.adminUserId);
      await assertRlsIsEnforced(db);
      expect(await countVisible(db, "site_crew", "site_id = $1", [SITE]), "another company's crew").toBe(0);
    });
  });
});
