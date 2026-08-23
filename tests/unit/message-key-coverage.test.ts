import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every message key the code can return has an English entry (#104).
 *
 * `locale-parity.test.ts` guards the other direction: every key in `en.json` is
 * translated, filled in, in the other nine. Neither it nor the type checker can
 * see this failure — a union member that nobody ever added to `en.json`. It
 * does not throw: next-intl renders the raw path, so `sites.errNameRequired`
 * appears where a sentence should be, and the build stays green. That is
 * exactly how `nav.agenda` was in front of real users for seventy minutes.
 *
 * The unions are read out of the source rather than imported, because they are
 * types — they do not exist at runtime, and a test that enumerated them by hand
 * would only ever check the half somebody remembered to copy.
 */
const UNIONS = [
  { file: "app/[locale]/auth/state.ts", type: "AuthMessageKey", namespace: "auth" },
  { file: "src/features/weather/messages.ts", type: "WeatherMessageKey", namespace: "weather" },
  { file: "src/features/weather/messages.ts", type: "AlertReasonKey", namespace: "weather" },
  { file: "src/features/sites/messages.ts", type: "SiteMessageKey", namespace: "sites" },
  { file: "src/features/employees/messages.ts", type: "EmployeeMessageKey", namespace: "employees" },
  { file: "src/features/operational-reports/messages.ts", type: "ReportMessageKey", namespace: "operationalReports" },
  { file: "src/features/operational-reports/messages.ts", type: "TemplateMessageKey", namespace: "reportTemplates" },
  { file: "src/features/time-tracking/actions.ts", type: "ManualEntryMessageKey", namespace: "time" },
  { file: "src/features/companies/types.ts", type: "VatLookupMessageKey", namespace: "companies" },
  { file: "src/features/partners/messages.ts", type: "PartnerMessageKey", namespace: "companies" },
  { file: "src/features/roster/messages.ts", type: "RosterMessageKey", namespace: "roster" },
  { file: "src/features/assignments/feed-actions.ts", type: "AgendaFeedMessageKey", namespace: "agenda" },
  { file: "src/features/assignments/swap-actions.ts", type: "SwapMessageKey", namespace: "agenda" },
];

type Messages = Record<string, Record<string, string>>;
const english = JSON.parse(readFileSync("messages/en.json", "utf8")) as Messages;

/** The members of `export type X = "a" | "b" …`, comments and all. */
function members(file: string, type: string): string[] {
  const source = readFileSync(file, "utf8");
  const start = source.indexOf(`export type ${type} =`);
  if (start === -1) return [];
  // The declaration ends at the first semicolon that is not inside a comment.
  const body = source.slice(start).replace(/\/\/.*$/gm, "").split(";")[0];
  return [...body.matchAll(/"(\w+)"/g)].map((match) => match[1]);
}

describe("message key coverage", () => {
  for (const { file, type, namespace } of UNIONS) {
    const keys = members(file, type);

    it(`reads ${type} out of the source`, () => {
      // A parser that silently matched nothing would make the next assertion
      // pass no matter what the union contained.
      expect(keys.length, `members parsed from ${file}`).toBeGreaterThan(1);
      expect(new Set(keys).size, `${type} has a duplicate member`).toBe(keys.length);
    });

    it(`has an English sentence for every ${type}`, () => {
      const missing = keys.filter((key) => !(key in (english[namespace] ?? {})));
      expect(missing, `${type} members with no ${namespace} entry in en.json`).toEqual([]);
    });
  }
});
