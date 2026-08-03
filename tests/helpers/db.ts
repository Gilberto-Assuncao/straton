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
 * Confirms RLS is actually being enforced before any isolation claim is made.
 *
 * Worth its own helper because the failure it guards against is silent: connect
 * with a superuser or a BYPASSRLS role and every isolation test passes while
 * proving nothing at all.
 */
export async function assertRlsIsEnforced(db: Client): Promise<void> {
  const { rows } = await db.query<{ bypass: boolean; role: string }>(
    "select rolbypassrls as bypass, current_user as role from pg_roles where rolname = current_user",
  );
  const row = rows[0];
  if (!row) throw new Error("Could not determine the current role");
  if (row.bypass) {
    throw new Error(
      `Connected as "${row.role}", which bypasses RLS. Point TEST_DATABASE_URL at a role without BYPASSRLS, or these tests prove nothing.`,
    );
  }
}

/** Demo dataset identifiers, seeded by supabase/seed-demo.sql. */
export const DEMO = {
  belnex: {
    companyId: "d0000001-0000-4000-8000-000000000001",
    adminUserId: "d0000002-0000-4000-8000-000000000101",
    fieldUserId: "d0000002-0000-4000-8000-000000000104",
    projectId: "d0000006-0000-4000-8000-000000000101",
    siteId: "d0000005-0000-4000-8000-000000000101",
  },
  nordclean: {
    companyId: "d0000001-0000-4000-8000-000000000002",
    adminUserId: "d0000002-0000-4000-8000-000000000201",
    projectId: "d0000006-0000-4000-8000-000000000201",
    siteId: "d0000005-0000-4000-8000-000000000201",
  },
  /** Client of Nordclean only — nothing links it to Belnex. */
  unrelatedCompanyId: "d0000001-0000-4000-8000-000000000005",
} as const;
