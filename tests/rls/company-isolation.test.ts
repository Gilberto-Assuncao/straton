import { describe, expect, it, beforeAll } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Proves tenant isolation: a member of one company cannot read or write
 * another company's data.
 *
 * This is the most valuable test in the suite. RLS is on across all 35 tables,
 * but a regression in one policy exposes one customer's payroll and workforce
 * records to another — and neither `typecheck` nor `build` can see it. Both
 * RLS bugs found on 2026-08-01 shipped through a green build.
 *
 * Requires TEST_DATABASE_URL. Point it at a local Supabase, never production:
 * these run inside a rolled-back transaction, but a connection string in a test
 * runner is not where production credentials belong.
 */
const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb("tenant isolation", () => {
  beforeAll(async () => {
    // Guards the whole file. Checked after actAs, because the role that
    // decides whether RLS applies is the one in effect during the query — not
    // the one the connection was opened with.
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      await assertRlsIsEnforced(db);
    });
  });

  // Each table is named explicitly rather than looped, so a failure says which
  // one leaked without reading the loop index.
  const tenantTables = [
    "sites",
    "sites",
    "timesheets",
    "timesheet_entries",
    "employee_records",
    "teams",
    "operational_reports",
    "payroll_periods",
    "payroll_consolidations",
    "company_memberships",
  ] as const;

  for (const table of tenantTables) {
    it(`does not leak ${table} from another company`, async () => {
      await withRollback(async (db) => {
        await actAs(db, DEMO.belnex.adminUserId);
        const { rows } = await db.query<{ count: string }>(
          `select count(*)::text as count from public.${table} where company_id = $1`,
          [DEMO.nordclean.companyId],
        );
        expect(rows[0].count).toBe("0");
      });
    });
  }

  it("still shows the company its own data", async () => {
    // The mirror of every test above: a policy that denies everything would
    // pass them all.
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.sites where company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });
  });

  it("does not allow writing into another company", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      // Either outcome is acceptable — raised by the WITH CHECK clause, or
      // accepted and filtered to nothing. A created row is not.
      await attemptWrite(
        db,
        `insert into public.sites (company_id, name, address, status)
         values ($1, '__leak test__', 'should never exist', 'planning')`,
        [DEMO.nordclean.companyId],
      );

      await db.query("reset role");
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.sites where name = '__leak test__'",
      );
      expect(rows[0].count).toBe("0");
    });
  });

  it("does not allow updating another company's rows", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      await attemptWrite(db, "update public.sites set name = '__hijacked__' where company_id = $1", [
        DEMO.nordclean.companyId,
      ]);

      await db.query("reset role");
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.sites where name = '__hijacked__'",
      );
      expect(rows[0].count).toBe("0");
    });
  });
});

describeIfDb("related-company visibility", () => {
  // Regression cover for migration 202608010001. The first version of
  // is_related_company named its parameter after a column on
  // company_relationships, Postgres resolved the ambiguity in favour of the
  // column, and the comparison became a tautology that made every company in
  // the database readable.
  it("reveals a company you have an active relationship with", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      const { rows } = await db.query<{ name: string }>(
        `select c.name from public.companies c
         join public.sites p on p.client_company_id = c.id
         where p.id = $1`,
        [DEMO.belnex.siteId],
      );
      expect(rows).toHaveLength(1);
    });
  });

  it("keeps an unrelated company invisible", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.companies where id = $1",
        [DEMO.unrelatedCompanyId],
      );
      expect(rows[0].count).toBe("0");
    });
  });

  it("does not turn a relationship into access to that company's data", async () => {
    // Nordclean is a partner of Belnex, so Belnex can see that it exists.
    // Seeing the company must not imply seeing its people or its hours.
    await withRollback(async (db) => {
      await actAs(db, DEMO.belnex.adminUserId);

      const visible = await db.query<{ count: string }>(
        "select count(*)::text as count from public.companies where id = $1",
        [DEMO.nordclean.companyId],
      );
      expect(visible.rows[0].count).toBe("1");

      const members = await db.query<{ count: string }>(
        "select count(*)::text as count from public.company_memberships where company_id = $1",
        [DEMO.nordclean.companyId],
      );
      expect(members.rows[0].count).toBe("0");
    });
  });
});
