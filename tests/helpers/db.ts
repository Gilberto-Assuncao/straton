import { Client } from "pg";

/**
 * Runs `fn` inside a transaction that is always rolled back.
 *
 * Nothing to clean up, and a failing assertion cannot leave rows behind — the
 * rollback is in a `finally`. This is what makes it safe to insert the fixtures
 * a security test needs without a teardown script that could itself be buggy.
 */
export async function withRollback<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) throw new Error("TEST_DATABASE_URL is not set");

  const db = new Client({ connectionString });
  await db.connect();
  await db.query("begin");
  try {
    return await fn(db);
  } finally {
    await db.query("rollback");
    await db.end();
  }
}

/**
 * Switches the transaction to the `authenticated` role with a given user id,
 * which is how PostgREST presents a logged-in request — so the policies under
 * test are evaluated exactly as they are in production.
 *
 * `set local` scopes this to the transaction, so the rollback undoes it too.
 */
export async function actAs(db: Client, userId: string): Promise<void> {
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
}

/**
 * Confirms RLS is actually being enforced, and must be called *after* `actAs`.
 *
 * The role that matters is the one in effect while the queries run, not the one
 * the connection was opened with: local Supabase and CI both connect as
 * `postgres`, and `actAs` then switches to `authenticated` — which is exactly
 * what PostgREST does for a logged-in request.
 *
 * Worth its own helper because the failure it guards against is silent. Left
 * as `postgres`, every isolation assertion below passes while proving nothing.
 */
export async function assertRlsIsEnforced(db: Client): Promise<void> {
  const { rows } = await db.query<{ bypass: boolean; role: string }>(
    "select current_user as role, (select rolbypassrls from pg_roles where rolname = current_user) as bypass",
  );
  const row = rows[0];
  if (!row) throw new Error("Could not determine the current role");
  if (row.bypass) {
    throw new Error(
      `Queries would run as "${row.role}", which bypasses RLS — these tests would prove nothing. actAs() must switch to a role without BYPASSRLS.`,
    );
  }
}

/**
 * Attempts a write that is expected to be refused, and reports whether it was.
 *
 * RLS rejects a forbidden INSERT by raising, which aborts the whole
 * transaction — every later query then fails with "current transaction is
 * aborted" and the test reports a harness error instead of a verdict. The
 * savepoint contains the rejection so the assertions after it can still run.
 *
 * Returns false when the write was blocked. `true` does not by itself mean a
 * leak: a policy may accept the statement and filter it to zero rows, so the
 * caller still has to check what actually landed.
 */
export async function attemptWrite(db: Client, sql: string, params: unknown[] = []): Promise<boolean> {
  await db.query("savepoint attempted_write");
  try {
    await db.query(sql, params);
    await db.query("release savepoint attempted_write");
    return true;
  } catch {
    await db.query("rollback to savepoint attempted_write");
    return false;
  }
}

/** Demo dataset identifiers, seeded by supabase/seed-demo.sql. */
export const DEMO = {
  belnex: {
    companyId: "d0000001-0000-4000-8000-000000000001",
    adminUserId: "d0000002-0000-4000-8000-000000000101",
    fieldUserId: "d0000002-0000-4000-8000-000000000104",
    siteId: "d0000005-0000-4000-8000-000000000101",
  },
  nordclean: {
    companyId: "d0000001-0000-4000-8000-000000000002",
    adminUserId: "d0000002-0000-4000-8000-000000000201",
    siteId: "d0000005-0000-4000-8000-000000000201",
  },
  /**
   * GeoTech, an accepted partner on Belnex's chantier.
   *
   * The delegation case, and the only one that can prove the privacy boundary
   * of #83: two companies on the same location, each entitled to its own view.
   * Nordclean is not a substitute — it is only *invited*, and on another site.
   */
  geotech: {
    companyId: "d0000001-0000-4000-8000-000000000003",
    adminUserId: "d0000002-0000-4000-8000-000000000301",
    otherUserId: "d0000002-0000-4000-8000-000000000302",
  },
  /** Client of Nordclean only — nothing links it to Belnex. */
  unrelatedCompanyId: "d0000001-0000-4000-8000-000000000005",
} as const;
