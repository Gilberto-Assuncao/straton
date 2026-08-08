/**
 * Formatting and export for the worked-hours report (#9).
 *
 * Kept out of the `server-only` module so it can be unit tested — the same
 * split as `partners/invite-token.ts` and `partners/chain.ts`. A wrong number
 * here is not a broken screen; it is someone paid for the wrong hours, found
 * weeks later.
 */

export interface WorkedHoursPerson {
  membershipId: string;
  name: string;
  jobTitle: string | null;
  approvedMinutes: number;
  submittedMinutes: number;
  draftMinutes: number;
  entryCount: number;
}

export interface WorkedHoursSite {
  siteId: string;
  siteName: string | null;
  projectName: string | null;
  approvedMinutes: number;
  pendingMinutes: number;
  peopleCount: number;
}

export interface WorkedHoursReport {
  from: string;
  to: string;
  /** YYYY-MM, the value the month picker round-trips. */
  month: string;
  people: WorkedHoursPerson[];
  sites: WorkedHoursSite[];
  totals: { approvedMinutes: number; submittedMinutes: number; draftMinutes: number };
}

/** `7h30`, not `7.5` — a payroll office reads hours and minutes, not decimals. */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

/**
 * The same numbers as a CSV, because the accountant needs a file.
 *
 * Decimal hours here rather than `7h30`: this column gets summed in a
 * spreadsheet, and `7h30` does not add up. The raw minutes travel alongside so
 * nothing downstream depends on the rounding.
 */
export function toCsv(report: WorkedHoursReport, headers: Record<string, string>): string {
  const escape = (value: string) => (/[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const decimal = (minutes: number) => (minutes / 60).toFixed(2);

  const lines = [
    [
      headers.person,
      headers.jobTitle,
      headers.approvedHours,
      headers.submittedHours,
      headers.draftHours,
      headers.approvedMinutes,
      headers.entries,
    ]
      .map(escape)
      .join(";"),
    ...report.people.map((person) =>
      [
        escape(person.name),
        escape(person.jobTitle ?? ""),
        decimal(person.approvedMinutes),
        decimal(person.submittedMinutes),
        decimal(person.draftMinutes),
        String(person.approvedMinutes),
        String(person.entryCount),
      ].join(";"),
    ),
  ];

  // Semicolons, not commas: a comma is the decimal separator in a Belgian
  // locale, and Excel then puts the whole row into one cell.
  //
  // CRLF because Excel on Windows is the target; a bare LF shows one long row.
  return `${lines.join("\r\n")}\r\n`;
}
