import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Who may be told that a work location changed (#83).
 *
 * The table, its three policies and its trigger have existed since #86 and
 * nothing has ever exercised them — no test, and no screen. That is the exact
 * blind spot this project keeps finding: SQL nobody runs. It matters more here
 * than in most places, because the issue's own framing is that a notification
 * sent to one person too many is not noise, it is disclosure.
 *
 * The rule being proved is subtle and easy to get backwards. The general
 * contractor picks *companies*, never people inside them, and cannot read the
 * subcontractor's list afterwards — because on a Belgian chantier the main
 * contractor often may not see the subcontractor's staff at all, and a screen
 * offering "choose who from GeoTech receives this" would have leaked GeoTech's
 * payroll before a single notification was sent.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Belnex's chantier, on which GeoTech is an accepted partner. */
const SITE = DEMO.belnex.siteId;

describeIfDb("choosing who hears about a location", () => {
  it("the location's company subscribes one of its own people", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);

      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId],
      );
      expect(wrote, "an admin subscribing their own colleague").toBe(true);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.site_notification_subscribers where site_id = $1 and user_id = $2",
        [SITE, DEMO.belnex.fieldUserId],
      );
      expect(rows[0].count).toBe("1");
    });
  });

  it("but not somebody who does not work there", async () => {
    // The insert policy only ever checks the company_id it was handed. Without
    // the trigger, an admin could name their own company and a stranger's user
    // id, and subscribe them to a location they have nothing to do with.
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.belnex.companyId, DEMO.geotech.otherUserId],
      );
      expect(wrote, "subscribing somebody from another company as if they were ours").toBe(false);
    });
  });

  it("and not on another company's behalf", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.geotech.companyId, DEMO.geotech.otherUserId],
      );
      expect(wrote, "the main contractor picking people inside a subcontractor").toBe(false);
    });
  });

  it("an accepted partner subscribes its own people", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.geotech.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.geotech.companyId, DEMO.geotech.otherUserId],
      );
      expect(wrote, "the second level of the delegation").toBe(true);
    });
  });

  it("a company with no business here subscribes nobody", async () => {
    // Nordclean is invited to a different chantier and has never accepted this
    // one. An invitation is not access.
    await withRollback(async (db) => {
      await actAs(db, DEMO.nordclean.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.nordclean.companyId, DEMO.nordclean.adminUserId],
      );
      expect(wrote, "subscribing to somebody else's location").toBe(false);
    });
  });
});

describeIfDb("the privacy boundary", () => {
  it("the location's owner cannot read the partner's subscribers", async () => {
    // The one that matters. Everything else here is ordinary tenancy; this is
    // the rule the delegation exists for, and it is a *read* rule because that
    // is where it would leak.
    await withRollback(async (db) => {
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.geotech.companyId, DEMO.geotech.otherUserId],
      );

      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.site_notification_subscribers where company_id = $1",
        [DEMO.geotech.companyId],
      );
      expect(rows[0].count, "GeoTech's chosen people, seen by the main contractor").toBe("0");
    });
  });

  it("but does learn that they chose somebody, and how many", async () => {
    // The counterpart. Without this the owner cannot run the delegation at all
    // — they would have no way to see that a partner has not picked anyone yet
    // and chase them. Counts, never names.
    await withRollback(async (db) => {
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.geotech.companyId, DEMO.geotech.otherUserId],
      );

      await actAs(db, DEMO.belnex.adminUserId);
      const { rows } = await db.query<{ company_id: string; subscriber_count: string }>(
        "select company_id, subscriber_count::text from public.site_subscriber_companies($1)",
        [SITE],
      );
      const geotech = rows.find((row) => row.company_id === DEMO.geotech.companyId);
      expect(geotech, "the partner should appear in the summary").toBeDefined();
      expect(geotech!.subscriber_count).toBe("1");
    });
  });

  it("and a stranger gets nothing from the summary", async () => {
    await withRollback(async (db) => {
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.geotech.companyId, DEMO.geotech.otherUserId],
      );

      await actAs(db, DEMO.nordclean.adminUserId);
      const { rows } = await db.query(
        "select company_id from public.site_subscriber_companies($1)",
        [SITE],
      );
      expect(rows, "somebody with no relationship to the chantier").toHaveLength(0);
    });
  });
});

describeIfDb("removing somebody from the list", () => {
  it("really removes them", async () => {
    // The delete that reports success and does nothing has been found five
    // times in this schema. Here it would mean somebody keeps receiving
    // notifications about a chantier they were taken off — which nobody
    // re-checks, because the screen already said it was done.
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId],
      );

      await db.query("delete from public.site_notification_subscribers where site_id = $1 and user_id = $2", [
        SITE,
        DEMO.belnex.fieldUserId,
      ]);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.site_notification_subscribers where site_id = $1 and user_id = $2",
        [SITE, DEMO.belnex.fieldUserId],
      );
      expect(rows[0].count, "the row the delete claimed to remove").toBe("0");
    });
  });

  it("and one company cannot remove another's", async () => {
    await withRollback(async (db) => {
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.geotech.companyId, DEMO.geotech.otherUserId],
      );

      await actAs(db, DEMO.belnex.adminUserId);
      await db.query("delete from public.site_notification_subscribers where company_id = $1", [
        DEMO.geotech.companyId,
      ]);

      // Checked from outside the policy, because a delete filtered to zero rows
      // reports success exactly like one that worked.
      await db.query("reset role");
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.site_notification_subscribers where company_id = $1",
        [DEMO.geotech.companyId],
      );
      expect(rows[0].count, "GeoTech's subscriber, after Belnex tried to remove them").toBe("1");
    });
  });
});

describeIfDb("marking a notification read", () => {
  const NOTIFICATION_ID = "d0000010-0000-4000-8000-0000000000f1";

  async function aNotificationFor(db: Client, userId: string) {
    await db.query(
      `insert into public.notifications (id, user_id, company_id, type, title, message, action_url)
       values ($1, $2, $3, 'INFO', 'Something happened', 'Something happened', '/dashboard/sites')`,
      [NOTIFICATION_ID, userId, DEMO.belnex.companyId],
    );
  }

  it("the recipient may, and it sticks", async () => {
    await withRollback(async (db) => {
      await aNotificationFor(db, DEMO.belnex.fieldUserId);

      await actAs(db, DEMO.belnex.fieldUserId);
      await db.query("update public.notifications set read_at = now() where id = $1", [NOTIFICATION_ID]);

      const { rows } = await db.query<{ read_at: string | null }>(
        "select read_at from public.notifications where id = $1",
        [NOTIFICATION_ID],
      );
      expect(rows[0]?.read_at, "the read state the app just set").not.toBeNull();
    });
  });

  it("but cannot rewrite what it says", async () => {
    // A notification whose text the recipient can edit is not a record of
    // anything. The policy sees who you are, never which column you touched —
    // so this half lives in a trigger.
    await withRollback(async (db) => {
      await aNotificationFor(db, DEMO.belnex.fieldUserId);

      await actAs(db, DEMO.belnex.fieldUserId);
      const rewrote = await attemptWrite(db, "update public.notifications set title = 'Nothing to see' where id = $1", [
        NOTIFICATION_ID,
      ]);
      expect(rewrote, "editing the text of a notification about oneself").toBe(false);
    });
  });

  it("and somebody else's is not theirs to mark", async () => {
    await withRollback(async (db) => {
      await aNotificationFor(db, DEMO.belnex.adminUserId);

      await actAs(db, DEMO.belnex.fieldUserId);
      await db.query("update public.notifications set read_at = now() where id = $1", [NOTIFICATION_ID]);

      await db.query("reset role");
      const { rows } = await db.query<{ read_at: string | null }>(
        "select read_at from public.notifications where id = $1",
        [NOTIFICATION_ID],
      );
      expect(rows[0]?.read_at, "a colleague's notification, after someone else tried to mark it").toBeNull();
    });
  });
});
