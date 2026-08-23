import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * The client book (#85).
 *
 * A client used to be a row in `companies`, which meant a private client could
 * not exist at all and the client list was assembled from "companies we have a
 * relationship with". Now clients have a table, and the questions it raises are
 * the ones below: who may read a firm's customer list, who may add to it, and
 * whether "person or company" is a fact the database keeps true or a label the
 * interface writes and forgets.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const ADMIN = DEMO.belnex.adminUserId;
/** João Ferreira — a plain `employee`. */
const WORKER = DEMO.belnex.fieldUserId;

describeIfDb("who can read a firm's clients", () => {
  it("its own members can, and see both kinds", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query<{ kind: string }>(
        "select distinct kind from public.clients where company_id = $1 order by kind",
        [DEMO.belnex.companyId],
      );
      // Both kinds, not a count. An empty read would make every isolation
      // assertion below meaningless, and a count would go stale the day the
      // demo data grows — what matters is that a firm's book holds a company
      // and a person at the same time, which is the whole point of the table.
      expect(rows.map((row) => row.kind)).toEqual(["company", "individual"]);
    });
  });

  it("a worker can, because the site list names the client", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.clients where company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });
  });

  it("another company cannot", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.nordclean.adminUserId);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.clients where company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(rows[0].count).toBe("0");
    });
  });

  it("not even a partner standing on their site", async () => {
    // The narrowing this table makes on purpose. GeoTech is an accepted partner
    // on a Belnex chantier, so it reads that site — but a client list is the
    // customer book, and a subcontractor has no business in it.
    await withRollback(async (db) => {
      await actAs(db, DEMO.geotech.adminUserId);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.clients where company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(rows[0].count).toBe("0");
    });
  });
});

describeIfDb("who can add one", () => {
  it("a supervisor or above", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);
      const wrote = await attemptWrite(
        db,
        "insert into public.clients (company_id, kind, name) values ($1, 'individual', 'M. Dupont')",
        [DEMO.belnex.companyId],
      );
      expect(wrote).toBe(true);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.clients where company_id = $1 and name = 'M. Dupont'",
        [DEMO.belnex.companyId],
      );
      // A policy can accept the statement and filter it to nothing, so the
      // write is checked by what landed rather than by not raising.
      expect(rows[0].count).toBe("1");
    });
  });

  it("not a worker", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const wrote = await attemptWrite(
        db,
        "insert into public.clients (company_id, kind, name) values ($1, 'individual', 'M. Dupont')",
        [DEMO.belnex.companyId],
      );
      expect(wrote).toBe(false);
    });
  });

  it("and never for another company", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);
      const wrote = await attemptWrite(
        db,
        "insert into public.clients (company_id, kind, name) values ($1, 'individual', 'M. Dupont')",
        [DEMO.nordclean.companyId],
      );
      expect(wrote).toBe(false);
    });
  });
});

describeIfDb("person or company is kept true", () => {
  it("a person has no company behind them", async () => {
    await withRollback(async (db) => {
      await db.query("reset role");
      const wrote = await attemptWrite(
        db,
        `insert into public.clients (company_id, kind, name, linked_company_id)
         values ($1, 'individual', 'M. Dupont', $2)`,
        [DEMO.belnex.companyId, DEMO.unrelatedCompanyId],
      );
      // Not RLS — a check constraint, so it holds for the service role and any
      // migration too. The kind has to be a fact, or the billing question it
      // exists to answer goes back to being a guess.
      expect(wrote).toBe(false);
    });
  });

  it("a company client has one", async () => {
    await withRollback(async (db) => {
      await db.query("reset role");
      const wrote = await attemptWrite(
        db,
        "insert into public.clients (company_id, kind, name) values ($1, 'company', 'Sans société')",
        [DEMO.belnex.companyId],
      );
      expect(wrote).toBe(false);
    });
  });

  it("and the same company is not a client twice", async () => {
    await withRollback(async (db) => {
      await db.query("reset role");
      const { rows } = await db.query<{ id: string; linked: string }>(
        `select id, linked_company_id as linked from public.clients
         where company_id = $1 and linked_company_id is not null limit 1`,
        [DEMO.belnex.companyId],
      );
      expect(rows[0], "a company client in the demo data").toBeDefined();
      const wrote = await attemptWrite(
        db,
        "insert into public.clients (company_id, kind, name, linked_company_id) values ($1, 'company', 'Duplicate', $2)",
        [DEMO.belnex.companyId, rows[0].linked],
      );
      expect(wrote).toBe(false);
    });
  });
});

describeIfDb("the sites that were migrated", () => {
  it("point at a client belonging to the same company", async () => {
    // What the backfill had to get right. A site pointing at another firm's
    // client would be a tenant leak written by a migration rather than by a
    // policy — and no policy would catch it, because the row is legitimately
    // readable by whoever owns the site.
    await withRollback(async (db) => {
      await db.query("reset role");
      const { rows } = await db.query<{ count: string }>(
        `select count(*)::text as count
         from public.sites s
         join public.clients c on c.id = s.client_id
         where c.company_id <> s.company_id`,
      );
      expect(rows[0].count, "sites pointing at another company's client").toBe("0");
    });
  });

  it("and at least one of them is a person", async () => {
    // The case the model could not hold before this migration. Without it the
    // demo shows only company clients and the feature is invisible.
    await withRollback(async (db) => {
      await db.query("reset role");
      const { rows } = await db.query<{ count: string }>(
        `select count(*)::text as count
         from public.sites s
         join public.clients c on c.id = s.client_id
         where c.kind = 'individual'`,
      );
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });
  });
});
