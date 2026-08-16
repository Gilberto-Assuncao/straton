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

describeIfDb("limiting a subscription to one sector", () => {
  /** A second subdivision on Belnex's chantier, created inside the rollback. */
  const AREA = "d0000013-0000-4000-8000-0000000000f1";

  async function aSecondSubdivision(db: Client) {
    await db.query(
      `insert into public.site_areas (id, site_id, company_id, name)
       values ($1, $2, $3, 'Elétrica da Sala')`,
      [AREA, SITE, DEMO.belnex.companyId],
    );
  }

  it("the manager may narrow one to a sector", async () => {
    await withRollback(async (db) => {
      await aSecondSubdivision(db);
      await actAs(db, DEMO.belnex.adminUserId);

      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id)
         values ($1, $2, $3, $4)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId, AREA],
      );
      expect(wrote, "a subscription scoped to one sector").toBe(true);
    });
  });

  it("and the same person may also hear the whole location", async () => {
    // The old constraint was one row per person per location, which this
    // feature makes wrong: hearing about the chantier and being on the list
    // for one sector are two different subscriptions.
    await withRollback(async (db) => {
      await aSecondSubdivision(db);
      await actAs(db, DEMO.belnex.adminUserId);

      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id)
         values ($1, $2, $3, $4)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId, AREA],
      );
      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id)
         values ($1, $2, $3, null)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId],
      );
      expect(wrote, "the same person, now also on the location-wide list").toBe(true);
    });
  });

  it("but not twice for the whole location", async () => {
    // Without `nulls not distinct` these two rows would not collide, because
    // Postgres treats nulls as different from each other — and the person
    // would receive every notification twice.
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId],
      );
      const again = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId],
      );
      expect(again, "the same subscription a second time").toBe(false);
    });
  });

  it("and never to another location's sector", async () => {
    // `site_area_id` arrives from the caller, and the insert policy only checks
    // the values it was handed. Pointing at somebody else's subdivision is a
    // way of finding out that it exists.
    await withRollback(async (db) => {
      const { rows } = await db.query<{ id: string }>(
        "select id from public.site_areas where site_id = $1 limit 1",
        [DEMO.nordclean.siteId],
      );
      expect(rows[0], "a subdivision belonging to Nordclean").toBeDefined();

      await actAs(db, DEMO.belnex.adminUserId);
      const wrote = await attemptWrite(
        db,
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id)
         values ($1, $2, $3, $4)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId, rows[0].id],
      );
      expect(wrote, "scoping a subscription to another company's sector").toBe(false);
    });
  });

  it("deleting the sector takes the subscription with it, and never widens it", async () => {
    // `set null` here would have turned a subscription about one sector into a
    // subscription about the whole chantier, silently, at the moment somebody
    // deleted the subdivision — more people hearing more things, which is the
    // one direction this feature must never drift in.
    await withRollback(async (db) => {
      await aSecondSubdivision(db);
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id)
         values ($1, $2, $3, $4)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId, AREA],
      );

      await db.query("delete from public.site_areas where id = $1", [AREA]);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.site_notification_subscribers where site_id = $1 and user_id = $2",
        [SITE, DEMO.belnex.fieldUserId],
      );
      expect(rows[0].count, "the subscription that only spoke about the deleted sector").toBe("0");
    });
  });
});

describeIfDb("who the publisher will tell", () => {
  const AREA = "d0000013-0000-4000-8000-0000000000f2";
  const OTHER_AREA = "d0000013-0000-4000-8000-0000000000f3";

  async function twoSubdivisions(db: Client) {
    await db.query(
      `insert into public.site_areas (id, site_id, company_id, name) values
         ($1, $3, $4, 'Elétrica da Sala'),
         ($2, $3, $4, 'Cobertura')`,
      [AREA, OTHER_AREA, SITE, DEMO.belnex.companyId],
    );
  }

  it("everyone on the location, plus the sector's own list", async () => {
    await withRollback(async (db) => {
      await twoSubdivisions(db);
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id) values
           ($1, $2, $3, null),
           ($1, $2, $4, $5)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.adminUserId, DEMO.belnex.fieldUserId, AREA],
      );

      const { rows } = await db.query<{ user_id: string }>(
        "select user_id from private.site_notification_audience($1, $2)",
        [SITE, AREA],
      );
      const told = rows.map((row) => row.user_id).sort();
      expect(told, "the location-wide subscriber and the sector's").toEqual(
        [DEMO.belnex.adminUserId, DEMO.belnex.fieldUserId].sort(),
      );
    });
  });

  it("and a sector's list is not told about another sector", async () => {
    await withRollback(async (db) => {
      await twoSubdivisions(db);
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id) values
           ($1, $2, $3, $4)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId, AREA],
      );

      const { rows } = await db.query(
        "select user_id from private.site_notification_audience($1, $2)",
        [SITE, OTHER_AREA],
      );
      expect(rows, "somebody listening to Elétrica da Sala, told about Cobertura").toHaveLength(0);
    });
  });

  it("a change to the location itself skips the sector lists", async () => {
    // The address changed, or the client did. Nobody is being told about a
    // sector, so a subscription that only ever spoke about one has nothing to
    // say here — and including it would be the widening this design refuses.
    await withRollback(async (db) => {
      await twoSubdivisions(db);
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id, site_area_id) values
           ($1, $2, $3, null),
           ($1, $2, $4, $5)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.adminUserId, DEMO.belnex.fieldUserId, AREA],
      );

      const { rows } = await db.query<{ user_id: string }>(
        "select user_id from private.site_notification_audience($1, null)",
        [SITE],
      );
      expect(rows.map((row) => row.user_id), "only the location-wide subscriber").toEqual([
        DEMO.belnex.adminUserId,
      ]);
    });
  });
});

describeIfDb("the publisher's way in", () => {
  /**
   * `public.site_notification_audience` exists only because PostgREST does not
   * expose `private`, and it returns the audience across every company on the
   * location. The grants are the whole point of the wrapper: without the
   * revoke, any signed-in session could ask who from a partner company is
   * listening — the exact thing the two-level delegation exists to prevent.
   */
  it("a signed-in user cannot call it", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);

      const called = await attemptWrite(db, "select * from public.site_notification_audience($1, null)", [SITE]);
      expect(called, "the cross-company audience, asked for by an ordinary session").toBe(false);
    });
  });

  it("and it answers the same as the private one", async () => {
    // A wrapper that drifted from what it wraps would be a second place for
    // the audience rule to be wrong, which is what writing it in SQL avoided.
    await withRollback(async (db) => {
      await db.query(
        `insert into public.site_notification_subscribers (site_id, company_id, user_id)
         values ($1, $2, $3)`,
        [SITE, DEMO.belnex.companyId, DEMO.belnex.fieldUserId],
      );

      const wrapped = await db.query("select user_id from public.site_notification_audience($1, null)", [SITE]);
      const direct = await db.query("select user_id from private.site_notification_audience($1, null)", [SITE]);
      expect(wrapped.rows, "the wrapper against the function it wraps").toEqual(direct.rows);
      expect(wrapped.rows.length, "the subscriber just added").toBeGreaterThan(0);
    });
  });
});
