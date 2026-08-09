import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";

/**
 * Every RPC the app calls, called the way the app calls it.
 *
 * This file exists because of a bug reported from production: creating a team
 * failed with a generic message, and so did editing a team and — worse —
 * creating a company, which is the onboarding path. None of the three had
 * anything wrong with their own logic.
 *
 * `public.create_team` is a thin wrapper over `private.create_team`, and the
 * wrapper was SECURITY INVOKER. `authenticated` has no USAGE on the `private`
 * schema, so the inner name could not be resolved and the call died before
 * reaching a single line of the function:
 *
 *   ERROR: permission denied for schema private
 *
 * Policies never showed this because a policy stores the function by OID and
 * resolves nothing at run time; a SQL function body resolves names as the
 * invoker. And the suite never showed it because nothing in it called an RPC.
 * A hundred and fifty tests were green over a feature that could not work.
 *
 * The cases below cover the three that broke. The invariant at the bottom is
 * the part that matters more: no public function may name something in
 * `private` unless it runs as its definer. That is the rule the three violated,
 * it is checkable in the catalogue, and it covers the wrapper somebody writes
 * next month without having read any of this.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** Aline Dubois — owner/admin of the demo company. */
const ADMIN = DEMO.belnex.adminUserId;
/** João Ferreira — plain `employee`. */
const WORKER = DEMO.belnex.fieldUserId;

describeIfDb("create_team", () => {
  it("works for an admin, which it did not in production", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ id: string }>(
        "select public.create_team($1, 'Team A', null, null, 'active', '#22c55e', null, '{}') as id",
        [DEMO.belnex.companyId],
      );
      expect(rows[0].id).toBeTruthy();
    });
  });

  it("is still refused for an employee", async () => {
    // The fix let the wrapper resolve a name; it must not have widened who may
    // call it. The authorisation lives inside the private function and is
    // unchanged.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const created = await attemptWrite(
        db,
        "select public.create_team($1, 'Team B', null, null, 'active', null, null, '{}')",
        [DEMO.belnex.companyId],
      );
      expect(created).toBe(false);
    });
  });
});

describeIfDb("update_team", () => {
  it("works for an admin", async () => {
    await withRollback(async (db) => {
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ id: string }>(
        "select public.create_team($1, 'Team C', null, null, 'active', null, null, '{}') as id",
        [DEMO.belnex.companyId],
      );
      const renamed = await attemptWrite(
        db,
        "select public.update_team($1, 'Team C renamed', null, null, 'active', null, null)",
        [rows[0].id],
      );
      expect(renamed).toBe(true);
    });
  });
});

describeIfDb("create_company", () => {
  it("works for any signed-in person, because it is the onboarding path", async () => {
    // The most serious of the three. A new customer could not create their
    // company at all.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ id: string }>(
        "select public.create_company('Nova Lda', 'Nova', 'BE', 'en', 'Europe/Brussels', 'EUR') as id",
      );
      expect(rows[0].id).toBeTruthy();
    });
  });

  it("accepts every language the interface offers", async () => {
    // The fourth copy of the language list lived in here, frozen at five, and
    // would have refused a company created in any of the other five.
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      for (const language of ["en", "pt", "pt-br", "fr", "nl", "de", "pl", "ro", "es", "it"]) {
        const accepted = await attemptWrite(
          db,
          "select public.create_company($1, $1, 'BE', $2, 'Europe/Brussels', 'EUR')",
          [`Co ${language}`, language],
        );
        expect(accepted, `create_company refused ${language}`).toBe(true);
      }
    });
  });

  it("refuses a language the interface does not offer", async () => {
    await withRollback(async (db) => {
      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);

      const accepted = await attemptWrite(
        db,
        "select public.create_company('Klingon Ltd', 'Klingon', 'BE', 'tlh', 'Europe/Brussels', 'EUR')",
      );
      expect(accepted).toBe(false);
    });
  });
});

describeIfDb("the invariant behind the bug", () => {
  it("has no public function that reaches into `private` as the invoker", () => {
    // The rule, rather than a list of the three that broke. `authenticated` has
    // no USAGE on `private`, so any public function whose body names something
    // in there must run as its definer or it cannot resolve the name — and it
    // fails at call time, which no policy test and no build will ever reveal.
    //
    // This covers the wrapper somebody adds next month.
    return withRollback(async (db) => {
      const { rows } = await db.query<{ proname: string }>(
        `select p.proname
           from pg_proc p
           join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public'
            -- Plain functions only: pg_get_functiondef() raises on aggregates,
            -- and the extensions this database carries define several.
            and p.prokind = 'f'
            and not p.prosecdef
            and pg_get_functiondef(p.oid) ~ 'private\.'
          order by p.proname`,
      );
      expect(rows.map((row) => row.proname), "public functions calling private without definer rights").toEqual([]);
    });
  });

  it("exposes every RPC the application calls", () => {
    // A name the app calls that does not exist fails the same silent way: a
    // generic error on screen and nothing in the build to warn anyone.
    function walk(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
      });
    }

    const called = new Set<string>();
    for (const file of ["app", "components", "src", "lib"].flatMap(walk)) {
      for (const match of readFileSync(file, "utf8").matchAll(/\.rpc\(\s*["'`]([\w]+)["'`]/g)) {
        called.add(match[1]);
      }
    }
    expect(called.size, "found no rpc calls at all — the scan is broken").toBeGreaterThan(0);

    return withRollback(async (db) => {
      const { rows } = await db.query<{ proname: string }>(
        "select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'",
      );
      const exposed = new Set(rows.map((row) => row.proname));
      const missing = [...called].filter((name) => !exposed.has(name));
      expect(missing, "RPCs the app calls that do not exist in the public schema").toEqual([]);
    });
  });
});
