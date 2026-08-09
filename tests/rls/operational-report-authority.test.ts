import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Who may write, submit and review a field report (#65).
 *
 * `operational_reports` is the timesheet again — `status`, `submitted_at`,
 * `reviewed_by`, `reviewed_at`, and `starts_at` / `ends_at` / `break_minutes` —
 * and until this existed the only rule on writing it was "you are a member of
 * this company". Verified as João Ferreira, role `employee`:
 *
 *   approving his own report                     -> accepted
 *   rewriting a colleague's report, +4 hours     -> accepted
 *   rewriting the history trail, author included -> accepted
 *
 * Found by sweeping every write policy rather than by hitting it, after the
 * same shape turned up four times in a row.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** João Ferreira — plain `employee`, and the author of the fixtures below. */
const WORKER = DEMO.belnex.fieldUserId;
/** Karim Benali — a colleague with no review rights. */
const COLLEAGUE = "d0000002-0000-4000-8000-000000000105";
/** Sofia Almeida — manager, not an owner. */
const MANAGER = "d0000002-0000-4000-8000-000000000102";

const REPORT = "c0000009-0000-4000-8000-0000000000d1";

/**
 * A report in a given state, seeded with no JWT.
 *
 * Before `actAs`, because the rules under test refuse a worker who files a
 * report that is already approved — which is the state several cases need to
 * begin from.
 */
async function seedReport(db: Client, workerId: string, status: string): Promise<void> {
  await db.query(
    `insert into public.operational_reports (id, company_id, worker_id, created_by, report_date, activity, status)
     values ($1, $2, $3, $3, current_date, 'Cable pulling, block B', $4)`,
    [REPORT, DEMO.belnex.companyId, workerId, status],
  );
}

async function statusOf(db: Client): Promise<string | undefined> {
  const { rows } = await db.query<{ status: string }>("select status from public.operational_reports where id = $1", [REPORT]);
  return rows[0]?.status;
}

function setStatus(db: Client, status: string) {
  return attemptWrite(db, "update public.operational_reports set status = $1 where id = $2", [status, REPORT]);
}

function rewrite(db: Client) {
  return attemptWrite(db, "update public.operational_reports set activity = 'rewritten' where id = $1", [REPORT]);
}

describeIfDb("reviewing a field report", () => {
  it("is refused for the worker who wrote it", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "submitted");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(false);
      expect(await statusOf(db)).toBe("submitted");
    });
  });

  it("works for a manager", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "submitted");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(true);
      expect(await statusOf(db)).toBe("approved");
    });
  });

  it("records the reviewer as the caller, not as whoever the request names", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "submitted");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      await db.query("update public.operational_reports set status = 'approved', reviewed_by = $1 where id = $2", [WORKER, REPORT]);
      const { rows } = await db.query<{ reviewed_by: string }>("select reviewed_by from public.operational_reports where id = $1", [REPORT]);
      expect(rows[0].reviewed_by).toBe(MANAGER);
    });
  });

  it("refuses to review a report nobody submitted", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "draft");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await setStatus(db, "approved")).toBe(false);
    });
  });
});

describeIfDb("writing a field report", () => {
  it("cannot be filed in someone else's name", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const filed = await attemptWrite(
        db,
        `insert into public.operational_reports (company_id, worker_id, created_by, report_date, activity, status)
         values ($1, $2, $2, current_date, 'not mine', 'draft')`,
        [DEMO.belnex.companyId, COLLEAGUE],
      );
      expect(filed).toBe(false);
    });
  });

  it("cannot be filed already approved", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const filed = await attemptWrite(
        db,
        `insert into public.operational_reports (company_id, worker_id, created_by, report_date, activity, status)
         values ($1, $2, $2, current_date, 'born approved', 'approved')`,
        [DEMO.belnex.companyId, WORKER],
      );
      expect(filed).toBe(false);
    });
  });

  it("lets the author edit their own draft", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "draft");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await rewrite(db)).toBe(true);
    });
  });

  it("refuses a colleague rewriting it", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "draft");
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      expect(await rewrite(db)).toBe(false);
    });
  });

  it("refuses any edit once approved, including by its author", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "approved");
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      expect(await rewrite(db)).toBe(false);
    });
  });

  it("refuses any edit once approved, including by a manager", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "approved");
      await actAs(db, MANAGER);
      await assertRlsIsEnforced(db);

      expect(await rewrite(db)).toBe(false);
    });
  });
});

describeIfDb("the answers on the form", () => {
  async function seedValue(db: Client): Promise<void> {
    const { rows } = await db.query<{ id: string }>("select id from public.report_template_fields limit 1");
    await db.query(
      `insert into public.operational_report_values (report_id, field_id, company_id, value_text)
       values ($1, $2, $3, 'first answer')`,
      [REPORT, rows[0].id, DEMO.belnex.companyId],
    );
  }

  async function valueCount(db: Client): Promise<number> {
    const { rows } = await db.query<{ count: string }>(
      "select count(*)::text as count from public.operational_report_values where report_id = $1",
      [REPORT],
    );
    return Number(rows[0].count);
  }

  it("can be cleared by the author while the report is a draft", async () => {
    // This is also a bug fix, not only a lock. There was no DELETE policy at
    // all, so the app's replaceValues() deleted nothing — silently — and the
    // first real edit of a report would have left two answers to every question.
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "draft");
      await seedValue(db);
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      await db.query("delete from public.operational_report_values where report_id = $1", [REPORT]);
      expect(await valueCount(db)).toBe(0);
    });
  });

  it("survives a delete attempt once the report is approved", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "approved");
      await seedValue(db);
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      await attemptWrite(db, "delete from public.operational_report_values where report_id = $1", [REPORT]);
      expect(await valueCount(db)).toBe(1);
    });
  });

  it("cannot be rewritten once the report is approved", async () => {
    // Otherwise the lock is only on the header: the report stays approved while
    // its contents are replaced underneath.
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "approved");
      await seedValue(db);
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const changed = await attemptWrite(
        db,
        "update public.operational_report_values set value_text = 'rewritten' where report_id = $1",
        [REPORT],
      );
      expect(changed).toBe(false);
    });
  });

  it("cannot be added by a colleague", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "draft");
      const { rows } = await db.query<{ id: string }>("select id from public.report_template_fields limit 1");
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      const added = await attemptWrite(
        db,
        `insert into public.operational_report_values (report_id, field_id, company_id, value_text)
         values ($1, $2, $3, 'not mine')`,
        [REPORT, rows[0].id, DEMO.belnex.companyId],
      );
      expect(added).toBe(false);
    });
  });
});

describeIfDb("the history trail", () => {
  async function seedHistory(db: Client): Promise<string> {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.operational_report_history (report_id, company_id, actor_id, action)
       values ($1, $2, $3, 'submitted') returning id`,
      [REPORT, DEMO.belnex.companyId, WORKER],
    );
    return rows[0].id;
  }

  it("cannot be rewritten", async () => {
    // A trail the participants can edit is not a trail; it is a text box that
    // looks like evidence.
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "submitted");
      const id = await seedHistory(db);
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const changed = await attemptWrite(
        db,
        "update public.operational_report_history set action = 'approved', actor_id = $1 where id = $2",
        [WORKER, id],
      );
      expect(changed).toBe(false);
    });
  });

  it("records the author as the caller, whatever the row claims", async () => {
    await withRollback(async (db) => {
      await seedReport(db, WORKER, "submitted");
      await actAs(db, COLLEAGUE);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ actor_id: string }>(
        `insert into public.operational_report_history (report_id, company_id, actor_id, action)
         values ($1, $2, $3, 'approved') returning actor_id`,
        [REPORT, DEMO.belnex.companyId, WORKER],
      );
      expect(rows[0].actor_id).toBe(COLLEAGUE);
    });
  });
});
