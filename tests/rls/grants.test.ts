import { describe, expect, it } from "vitest";
import { withRollback } from "../helpers/db";

/**
 * Every table with a policy for `authenticated` must also be granted to it.
 *
 * RLS decides which *rows* a role may touch. A grant decides whether it may
 * touch the table at all. Miss the grant and every policy is unreachable —
 * the table simply refuses everyone, with an error that mentions permissions
 * and never mentions RLS.
 *
 * This is easy to miss because Supabase's hosted project carries a
 * default-privileges rule that hands out grants automatically, so a table
 * created through the dashboard or the API works there and fails on any
 * database built from the migration files. Both new tables on 2026-08-03 had
 * exactly this defect; it reached CI and no further.
 *
 * Written as a sweep rather than a per-table assertion so it covers tables
 * nobody has written yet.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeIfDb("table grants", () => {
  it("every table with an authenticated policy is reachable by that role", async () => {
    await withRollback(async (db) => {
      const { rows: broken } = await db.query<{ table_name: string; missing: string }>(
        // An ALL policy covers all four commands, so it is expanded rather than
        // compared literally — otherwise adding one would make this sweep skip
        // the table in silence.
        `with required as (
           select distinct p.tablename, c.privilege
           from pg_policies p
           cross join lateral (
             select unnest(
               case when upper(p.cmd) = 'ALL'
                 then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
                 else array[upper(p.cmd)]
               end
             ) as privilege
           ) c
           where p.schemaname = 'public' and 'authenticated' = any(p.roles)
         )
         select r.tablename as table_name, string_agg(r.privilege, ', ' order by r.privilege) as missing
         from required r
         where not exists (
           select 1 from information_schema.role_table_grants g
           where g.table_schema = 'public' and g.table_name = r.tablename
             and g.grantee = 'authenticated' and g.privilege_type = r.privilege
         )
         group by r.tablename
         order by r.tablename`,
      );

      // Named individually in the message, because "one table is wrong" without
      // saying which one is a failure you still have to go and investigate.
      expect(
        broken.map((row) => `${row.table_name} (missing ${row.missing})`),
        "tables with policies the authenticated role cannot reach",
      ).toEqual([]);
    });
  });

  it("finds the policies it claims to be checking", async () => {
    // A query that silently matched nothing would pass the test above forever.
    await withRollback(async (db) => {
      const { rows } = await db.query<{ count: string }>(
        `select count(distinct tablename)::text as count from pg_policies
         where schemaname = 'public' and 'authenticated' = any(roles)`,
      );
      expect(Number(rows[0].count)).toBeGreaterThan(20);
    });
  });
});
