import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Support access that grants nothing through RLS (#19).
 *
 * The whole design rests on one claim: being a platform admin is a privilege
 * the *application* consults, and the database has never heard of it. The
 * dangerous version of this feature — a company role for the platform owner, or
 * a loosened `private.is_company_member` — would pass every screen test and
 * every type check, and would quietly hand one account a key to every tenant.
 *
 * So the assertions below are mostly negative, and the important one is the
 * third block: Marc Dubois is on `platform_admins` and still reads exactly zero
 * Nordclean rows through policies. If that ever starts passing rows, the
 * feature has become the thing it was written to avoid.
 *
 * Reading a customer's data happens through the service role in
 * `src/features/support/`, gated on a session — which is exactly why it must
 * not also be reachable here.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Marc Dubois — admin of Belnex, and the platform owner in the demo dataset. */
const PLATFORM_ADMIN = DEMO.belnex.adminUserId;
/** João Ferreira — field worker at Belnex, on no privileged list at all. */
const WORKER = DEMO.belnex.fieldUserId;
/** Anouk Peeters — admin of Nordclean, the company being looked at. */
const CUSTOMER_ADMIN = DEMO.nordclean.adminUserId;

/**
 * A read that is expected to be refused.
 *
 * A missing grant raises exactly like a refused insert does, and aborts the
 * transaction the same way, so the savepoint helper serves both. `false` means
 * the statement was rejected outright; `true` only means it ran, which for a
 * select still says nothing about how many rows came back.
 */
const attemptRead = attemptWrite;

async function isPlatformAdmin(db: Client, userId: string): Promise<boolean> {
  await actAs(db, userId);
  const { rows } = await db.query<{ answer: boolean }>("select public.is_platform_admin() as answer");
  return rows[0].answer;
}

async function countVisible(db: Client, table: string, companyId: string): Promise<number> {
  const { rows } = await db.query<{ total: string }>(
    `select count(*)::text as total from public.${table} where company_id = $1`,
    [companyId],
  );
  return Number(rows[0].total);
}

describeIfDb("the platform-admin list", () => {
  it("cannot be read by anyone through the API, including the people on it", async () => {
    await withRollback(async (db) => {
      await actAs(db, PLATFORM_ADMIN);
      await assertRlsIsEnforced(db);

      // No grant and no policy: the list of who can look at customers is not
      // itself something the product can be made to display. The refusal here
      // is the grant's, which is why this is asserted rather than assumed —
      // Supabase's hosted default privileges would have handed one out.
      expect(
        await attemptRead(db, "select user_id from public.platform_admins"),
        "platform_admins readable by a platform admin",
      ).toBe(false);

      await actAs(db, WORKER);
      expect(
        await attemptRead(db, "select user_id from public.platform_admins"),
        "platform_admins readable by an ordinary member",
      ).toBe(false);
    });
  });

  it("cannot be added to from the API", async () => {
    await withRollback(async (db) => {
      await actAs(db, PLATFORM_ADMIN);
      await assertRlsIsEnforced(db);
      // The escalation move: a platform admin granting the privilege to
      // somebody else, or an ordinary member granting it to themselves. There
      // is deliberately no screen for this, and there is no path either.
      expect(
        await attemptWrite(db, "insert into public.platform_admins (user_id) values ($1)", [WORKER]),
        "a platform admin adding somebody to the list",
      ).toBe(false);

      await actAs(db, WORKER);
      expect(
        await attemptWrite(db, "insert into public.platform_admins (user_id) values ($1)", [WORKER]),
        "an ordinary member adding themselves to the list",
      ).toBe(false);
    });
  });

  it("has the person the demo dataset says it has", async () => {
    // The guard. Every assertion in this file about what a platform admin
    // cannot do would pass just as well if nobody were a platform admin.
    await withRollback(async (db) => {
      await db.query("reset role");
      const { rows } = await db.query<{ total: string }>(
        "select count(*)::text as total from public.platform_admins where user_id = $1",
        [PLATFORM_ADMIN],
      );
      expect(Number(rows[0].total), "seeded platform admins").toBe(1);
    });
  });
});

describeIfDb("is_platform_admin()", () => {
  it("answers about the caller and nobody else", async () => {
    await withRollback(async (db) => {
      await actAs(db, PLATFORM_ADMIN);
      // Before the first answer, not after: read as `postgres` the function
      // would report on whoever the connection belongs to and every line below
      // would still pass.
      await assertRlsIsEnforced(db);
      expect(await isPlatformAdmin(db, PLATFORM_ADMIN), "Marc, who is on the list").toBe(true);
      expect(await isPlatformAdmin(db, WORKER), "João, who is not").toBe(false);
      expect(await isPlatformAdmin(db, CUSTOMER_ADMIN), "Anouk, a customer's own admin").toBe(false);
    });
  });

  it("takes no argument, so it cannot be used to enumerate the list", async () => {
    // Security definer with a `user_id` parameter would answer the same
    // question about anybody — the table would be unreadable and its contents
    // still discoverable one call at a time.
    await withRollback(async (db) => {
      await db.query("reset role");
      const { rows } = await db.query<{ args: string }>(
        `select pg_get_function_identity_arguments(p.oid) as args
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'is_platform_admin'`,
      );
      expect(rows, "is_platform_admin() in the schema").toHaveLength(1);
      expect(rows[0].args, "its parameters").toBe("");
    });
  });

  it("is not callable by an unauthenticated visitor", async () => {
    await withRollback(async (db) => {
      await db.query("reset role");
      const { rows } = await db.query<{ anon: boolean }>(
        "select has_function_privilege('anon', 'public.is_platform_admin()', 'execute') as anon",
      );
      expect(rows[0].anon, "anon executing is_platform_admin()").toBe(false);
    });
  });
});

describeIfDb("what being a platform admin actually grants", () => {
  it("grants nothing at all through RLS", async () => {
    await withRollback(async (db) => {
      await actAs(db, PLATFORM_ADMIN);
      await assertRlsIsEnforced(db);

      // Marc is a platform admin *and* an admin of Belnex. The first fact must
      // change nothing about the second: he sees his own company and, through
      // policies, nothing of Nordclean's.
      expect(await countVisible(db, "sites", DEMO.nordclean.companyId), "Nordclean sites").toBe(0);
      expect(
        await countVisible(db, "company_memberships", DEMO.nordclean.companyId),
        "Nordclean memberships",
      ).toBe(0);
      expect(
        await countVisible(db, "timesheet_entries", DEMO.nordclean.companyId),
        "Nordclean timesheet entries",
      ).toBe(0);

      // Not a vacuous zero: the same queries, same role, same transaction,
      // return rows for the company he is actually in.
      expect(await countVisible(db, "sites", DEMO.belnex.companyId), "Belnex sites").toBeGreaterThan(0);
      expect(
        await countVisible(db, "company_memberships", DEMO.belnex.companyId),
        "Belnex memberships",
      ).toBeGreaterThan(0);
    });
  });

  it("leaves the customer's data there to be found by the service role", async () => {
    // The counterpart to the zeros above: Nordclean is not an empty company, so
    // "0 rows" is a refusal and not an accident of the fixture. This is also
    // the path `src/features/support/data.ts` uses, gated on a session.
    await withRollback(async (db) => {
      await db.query("reset role");
      expect(
        await countVisible(db, "sites", DEMO.nordclean.companyId),
        "Nordclean sites, read without RLS",
      ).toBeGreaterThan(0);
    });
  });

  it("does not make support sessions readable through the API", async () => {
    await withRollback(async (db) => {
      await db.query("reset role");
      await db.query(
        `insert into public.support_sessions (admin_user_id, company_id, expires_at)
         values ($1, $2, now() + interval '30 minutes')`,
        [PLATFORM_ADMIN, DEMO.nordclean.companyId],
      );

      await actAs(db, PLATFORM_ADMIN);
      await assertRlsIsEnforced(db);
      expect(
        await attemptRead(db, "select id from public.support_sessions"),
        "support_sessions readable by the admin who opened one",
      ).toBe(false);

      await actAs(db, CUSTOMER_ADMIN);
      expect(
        await attemptRead(db, "select id from public.support_sessions"),
        "support_sessions readable by the company being looked at",
      ).toBe(false);
    });
  });

  it("cannot outlive its own start time", async () => {
    // `support_sessions_expiry_after_start`. A session written with an expiry
    // in the past would be refused by `refuseSupportSession` on the next
    // request, but it should never exist in the first place.
    await withRollback(async (db) => {
      await db.query("reset role");
      expect(
        await attemptWrite(
          db,
          `insert into public.support_sessions (admin_user_id, company_id, started_at, expires_at)
           values ($1, $2, now(), now() - interval '1 minute')`,
          [PLATFORM_ADMIN, DEMO.nordclean.companyId],
        ),
        "a session that expired before it started",
      ).toBe(false);
    });
  });
});

describeIfDb("the customer's own record that it happened", () => {
  it("is readable by the company that was looked at, and by nobody else", async () => {
    await withRollback(async (db) => {
      await db.query("reset role");
      // Written exactly as `startSupportSessionAction` writes it: into the
      // customer's company, through their existing audit policy. The
      // transparency of this feature is not a promise in a document, it is this
      // row being visible without anybody having to ask us for it.
      const { rowCount } = await db.query(
        `insert into public.audit_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
         values ($1, $2, 'support_session_started', 'company', $1, '{"access":"read-only"}'::jsonb)`,
        [DEMO.nordclean.companyId, PLATFORM_ADMIN],
      );
      // RLS refuses a forbidden write by matching no rows rather than raising,
      // so the fixture itself is checked before anything is concluded from it.
      expect(rowCount, "the seeded audit row").toBe(1);

      await actAs(db, CUSTOMER_ADMIN);
      await assertRlsIsEnforced(db);
      const { rows: theirs } = await db.query<{ action: string }>(
        `select action from public.audit_logs
         where company_id = $1 and action = 'support_session_started'`,
        [DEMO.nordclean.companyId],
      );
      expect(theirs.map((row) => row.action), "what Nordclean's admin can see").toEqual([
        "support_session_started",
      ]);

      // And not to the platform admin who wrote it. He is not in that company,
      // and nothing about this feature puts him in it — he reads it back the
      // same way he read the data: through the service role, deliberately.
      await actAs(db, PLATFORM_ADMIN);
      const { rows: his } = await db.query<{ action: string }>(
        `select action from public.audit_logs
         where company_id = $1 and action = 'support_session_started'`,
        [DEMO.nordclean.companyId],
      );
      expect(his, "what the platform admin can see of Nordclean's log").toEqual([]);
    });
  });

  it("is not readable by an ordinary member of the company", async () => {
    // `audit_logs_admin_read` narrows the trail to company admins, and a
    // support visit is not an exception to that.
    await withRollback(async (db) => {
      await db.query("reset role");
      await db.query(
        `insert into public.audit_logs (company_id, actor_id, action, entity_type, entity_id)
         values ($1, $2, 'support_session_started', 'company', $1)`,
        [DEMO.belnex.companyId, PLATFORM_ADMIN],
      );

      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query(
        `select id from public.audit_logs where company_id = $1 and action = 'support_session_started'`,
        [DEMO.belnex.companyId],
      );
      expect(rows, "what a field worker can see of their company's audit log").toEqual([]);
    });
  });
});
