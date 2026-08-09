import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Who may change what a company *is* (#65, part 2).
 *
 * The tables left over from the sweep hold no hours, so they were not urgent —
 * only wrong. Every one said "you are a member of this company", for insert and
 * update alike. Verified as João Ferreira, role `employee`:
 *
 *   creating a project out of nothing                        -> accepted
 *   renaming the fields of the report everyone fills in      -> accepted
 *   setting his own project role to `manager`, every project -> accepted
 *
 * The last one is privilege escalation rather than vandalism, which is why this
 * half was not merely tidying up.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Aline Dubois — owner/admin of Belnex. */
const ADMIN = DEMO.belnex.adminUserId;
/** João Ferreira — plain `employee`. */
const WORKER = DEMO.belnex.fieldUserId;

describeIfDb("the company's structure", () => {
  it("cannot have a project invented by a worker", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const created = await attemptWrite(
        db,
        "insert into public.projects (company_id, name, status) values ($1, 'invented', 'active')",
        [DEMO.belnex.companyId],
      );
      expect(created).toBe(false);
    });
  });

  it("can have one created by an admin", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const created = await attemptWrite(
        db,
        "insert into public.projects (company_id, name, status) values ($1, 'legitimate', 'active')",
        [DEMO.belnex.companyId],
      );
      expect(created).toBe(true);
    });
  });

  it("cannot have its sites renamed by a worker", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      await attemptWrite(db, "update public.sites set name = 'renamed' where company_id = $1", [DEMO.belnex.companyId]);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.sites where company_id = $1 and name = 'renamed'",
        [DEMO.belnex.companyId],
      );
      expect(Number(rows[0].count)).toBe(0);
    });
  });

  it("stays readable to a worker, who needs the sites to log time against", async () => {
    // The lock must not blind the people doing the work. A clock-in screen with
    // an empty site list is a worse outage than the hole being closed.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.sites where company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(Number(rows[0].count)).toBeGreaterThan(0);
    });
  });
});

describeIfDb("project roles", () => {
  it("cannot be raised by the person they apply to", async () => {
    // Not vandalism — this is how a worker becomes a project manager.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      await attemptWrite(db, "update public.project_memberships set role = 'manager' where company_id = $1", [
        DEMO.belnex.companyId,
      ]);
      const { rows } = await db.query<{ count: string }>(
        `select count(*)::text as count
         from public.project_memberships pm
         join public.company_memberships cm on cm.id = pm.company_membership_id
         where cm.user_id = $1 and pm.role = 'manager'`,
        [WORKER],
      );
      expect(Number(rows[0].count)).toBe(0);
    });
  });
});

describeIfDb("a supervisor", () => {
  /**
   * The seed has nobody who is a supervisor and nothing else — Sofia Almeida is
   * `manager,supervisor`, so testing against her proves nothing about the
   * distinction this migration draws.
   *
   * Rather than add a user (public.users is foreign-keyed to auth.users, so a
   * fixture would have to reach into the auth schema), this narrows an existing
   * colleague's roles inside the transaction. Rolled back like everything else.
   */
  const COLLEAGUE = "d0000002-0000-4000-8000-000000000105";

  async function narrowToSupervisor(db: Client): Promise<void> {
    const { rows } = await db.query<{ id: string }>(
      "select id from public.company_memberships where user_id = $1 and company_id = $2",
      [COLLEAGUE, DEMO.belnex.companyId],
    );
    await db.query("delete from public.membership_roles where membership_id = $1", [rows[0].id]);
    await db.query(
      "insert into public.membership_roles (membership_id, role_id) select $1, id from public.roles where key = 'supervisor'",
      [rows[0].id],
    );
  }

  it("may not rename the sites", async () => {
    // Two different powers. Signing off a week is not the same as changing what
    // the company is, and the app already drew this line — sites and templates
    // check owner/admin/administrator/manager and leave supervisor out.
    await withRollback(async (db) => {
      await narrowToSupervisor(db);
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      await attemptWrite(db, "update public.sites set name = 'renamed' where company_id = $1", [DEMO.belnex.companyId]);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.sites where company_id = $1 and name = 'renamed'",
        [DEMO.belnex.companyId],
      );
      expect(Number(rows[0].count)).toBe(0);
    });
  });

  it("may still approve a timesheet, which is the whole point of the split", async () => {
    // Proved through the action rather than by calling the role helper, which
    // `authenticated` cannot invoke directly — it resolves inside a policy, not
    // from a query.
    await withRollback(async (db) => {
      await narrowToSupervisor(db);
      const sheet = "b0000009-0000-4000-8000-0000000009f2";
      await db.query(
        `insert into public.timesheets (id, company_id, user_id, period_start, period_end, status)
         values ($1, $2, $3, date '2031-11-03', date '2031-11-09', 'submitted')`,
        [sheet, DEMO.belnex.companyId, WORKER],
      );
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      const approved = await attemptWrite(db, "update public.timesheets set status = 'approved' where id = $1", [sheet]);
      expect(approved).toBe(true);
    });
  });
});

describeIfDb("report template fields", () => {
  async function anyTemplate(db: Client): Promise<string> {
    const { rows } = await db.query<{ id: string }>("select id from public.report_templates where company_id = $1 limit 1", [
      DEMO.belnex.companyId,
    ]);
    return rows[0].id;
  }

  it("cannot be renamed by a worker", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      await attemptWrite(db, "update public.report_template_fields set label = 'changed' where company_id = $1", [
        DEMO.belnex.companyId,
      ]);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.report_template_fields where label = 'changed'",
      );
      expect(Number(rows[0].count)).toBe(0);
    });
  });

  it("can be deleted by an admin when nothing has been answered", async () => {
    // There was no DELETE policy at all, so the app's delete matched no rows and
    // the screen reported success — the same silent no-op as the report values
    // in part one.
    await withRollback(async (db) => {
      const templateId = await anyTemplate(db);
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ id: string }>(
        `insert into public.report_template_fields (company_id, template_id, key, label, field_type, display_order)
         values ($1, $2, 'brand_new', 'Brand new', 'text', 99) returning id`,
        [DEMO.belnex.companyId, templateId],
      );
      await db.query("delete from public.report_template_fields where id = $1", [rows[0].id]);

      const { rows: after } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.report_template_fields where id = $1",
        [rows[0].id],
      );
      expect(Number(after[0].count)).toBe(0);
    });
  });

  it("cannot be deleted once somebody has answered it", async () => {
    // `operational_report_values.field_id` cascades, so this would erase answers
    // from reports that have already been approved. Deactivation keeps the
    // history and hides the field from new reports.
    await withRollback(async (db) => {
      const { rows } = await db.query<{ id: string }>(
        `select f.id from public.report_template_fields f
         join public.operational_report_values v on v.field_id = f.id
         where f.company_id = $1 limit 1`,
        [DEMO.belnex.companyId],
      );
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      expect(await attemptWrite(db, "delete from public.report_template_fields where id = $1", [rows[0].id])).toBe(false);
      // And the alternative the message points at does work.
      expect(await attemptWrite(db, "update public.report_template_fields set active = false where id = $1", [rows[0].id])).toBe(
        true,
      );
    });
  });
});

describeIfDb("the audit log", () => {
  it("accepts nothing from a browser", async () => {
    // It took invented lines from any employee and let them be edited
    // afterwards, which is worse than having no audit log: it lends the
    // authority of a record to something anyone could author.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const written = await attemptWrite(
        db,
        `insert into public.audit_logs (company_id, actor_id, action, entity_type, entity_id)
         values ($1, $2, 'forged', 'timesheet', gen_random_uuid())`,
        [DEMO.belnex.companyId, WORKER],
      );
      expect(written).toBe(false);
    });
  });

  it("is not even readable by a worker", async () => {
    await withRollback(async (db) => {
      await db.query(
        `insert into public.audit_logs (company_id, actor_id, action, entity_type, entity_id)
         values ($1, $2, 'seeded', 'timesheet', gen_random_uuid())`,
        [DEMO.belnex.companyId, ADMIN],
      );
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ count: string }>("select count(*)::text as count from public.audit_logs");
      expect(Number(rows[0].count)).toBe(0);
    });
  });
});
