import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { withRollback } from "../helpers/db";

/**
 * Every database enum value that reaches a screen has a label, in every
 * language.
 *
 * These values arrive as English identifiers — `suspended`, `company_owner` —
 * that were being printed raw because they happened to read as English words.
 * Translating them means a lookup, and a lookup means a value with no entry now
 * throws in development and prints the key path in production.
 *
 * Adding a value to a Postgres enum is a migration nobody thinks of as a UI
 * change, which is exactly why this belongs here rather than in a code review
 * checklist. `ended` was already missing from the membership filter before any
 * of this, so the gap is not hypothetical.
 *
 * Lives in tests/rls because it is the only suite with a real database — the
 * enum is the source of truth and a hand-written copy of it would prove
 * nothing.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

const locales = readdirSync("messages").filter((file) => file.endsWith(".json"));

function namespace(locale: string, name: string): Record<string, string> {
  const json = JSON.parse(readFileSync(`messages/${locale}`, "utf8")) as Record<string, Record<string, string>>;
  return json[name] ?? {};
}

/** Enum name in Postgres → message key prefix in the `workforce` namespace. */
const ENUMS: { enumName: string; prefix: string }[] = [
  { enumName: "membership_status", prefix: "status_" },
  { enumName: "employment_type", prefix: "type_" },
];

describeIfDb("database values shown on screen", () => {
  it("finds the locale files it claims to check", () => {
    expect(locales.length).toBeGreaterThanOrEqual(9);
  });

  for (const { enumName, prefix } of ENUMS) {
    it(`has a label for every ${enumName} value, in every language`, async () => {
      await withRollback(async (db) => {
        const { rows } = await db.query<{ value: string }>(
          `select e.enumlabel as value
           from pg_type t join pg_enum e on e.enumtypid = t.oid
           where t.typname = $1`,
          [enumName],
        );
        // Guards the query itself: an enum renamed in a migration would return
        // nothing and make this pass while checking absolutely nothing.
        expect(rows.length, `no values found for the ${enumName} enum`).toBeGreaterThan(0);

        const missing: string[] = [];
        for (const locale of locales) {
          const messages = namespace(locale, "workforce");
          for (const { value } of rows) {
            if (!(`${prefix}${value}` in messages)) missing.push(`${locale}: ${prefix}${value}`);
          }
        }
        expect(missing, `${enumName} values with no label`).toEqual([]);
      });
    });
  }

  it("has a label for every role in the roles table", async () => {
    // Roles are rows rather than an enum, so a new one is an INSERT — even
    // easier to add without anyone thinking about the interface.
    await withRollback(async (db) => {
      const { rows } = await db.query<{ key: string }>("select key from public.roles");
      expect(rows.length, "no rows found in public.roles").toBeGreaterThan(0);

      const missing: string[] = [];
      for (const locale of locales) {
        const messages = namespace(locale, "workforce");
        for (const { key } of rows) {
          if (!(`role_${key}` in messages)) missing.push(`${locale}: role_${key}`);
        }
      }
      expect(missing, "roles with no label").toEqual([]);
    });
  });
});
