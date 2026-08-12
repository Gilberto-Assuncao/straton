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

/**
 * One subdivision of one work location, for the period (#77).
 *
 * `siteName` rides along because a subdivision name is only unique inside its
 * location — "1er étage" is a name two chantiers can both have, and two rows
 * carrying it with different numbers and no way to tell them apart would be
 * worse than no breakdown.
 *
 * `areaId` is null for hours nobody attributed: booked before the location was
 * divided, or from the quick-clock page, which never asks. Kept rather than
 * dropped, so a location's subdivisions always add up to the location.
 */
export interface WorkedHoursArea {
  siteId: string;
  siteName: string;
  areaId: string | null;
  areaName: string | null;
  isDefault: boolean;
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
  areas: WorkedHoursArea[];
  /**
   * The work locations the figures cover, empty meaning all of them (#77).
   *
   * Echoed back rather than left implicit in the URL. Every number on the page
   * and in the exported file is conditional on this, and a total that silently
   * covers three of eleven locations is the kind of figure that reaches a
   * client's invoice before anyone notices it is short.
   */
  siteIds: string[];
  totals: { approvedMinutes: number; submittedMinutes: number; draftMinutes: number };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the chosen work locations out of a query string (#77).
 *
 * Anything that is not a uuid is dropped rather than passed on. The report
 * functions take `uuid[]`, so a hand-edited URL would otherwise reach Postgres
 * as a cast error — a 500 on the reports page for what is really just noise in
 * a parameter.
 *
 * Dropping is safe here *because* the filter can only narrow: the RLS decides
 * what exists, and an id that survives this parse but belongs to another
 * company simply matches nothing. This function is a parser, not a gate, and it
 * is deliberately not the thing standing between a manager and someone else's
 * hours.
 */
export function parseSiteFilter(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? value.split(",") : [];
  // Deduplicated: `?sites=a,a` would otherwise be a longer array asking the
  // same question, and the count is shown to the user.
  return Array.from(new Set(raw.map((id) => id.trim()).filter((id) => UUID.test(id))));
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
