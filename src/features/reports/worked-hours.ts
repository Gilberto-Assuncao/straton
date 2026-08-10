import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type { WorkedHoursPerson, WorkedHoursReport, WorkedHoursSite } from "./worked-hours-format";

// One import path for callers; the implementations live outside `server-only`
// so the tests can reach them.
export { formatMinutes, parseSiteFilter, toCsv } from "./worked-hours-format";
export type { WorkedHoursPerson, WorkedHoursReport, WorkedHoursSite } from "./worked-hours-format";

/**
 * Worked hours per person, for a period (#9).
 *
 * The report a company needs at month end. Everything is kept in **minutes**
 * until the moment it is displayed: converting to decimal hours early and then
 * summing is how a report ends up 0.2h off its own rows.
 */

/**
 * Resolves the month to report on.
 *
 * Half-open on purpose: `>= from` and `< to`. A closed upper bound on a
 * timestamp column silently drops or double-counts whatever happens in the last
 * second of the month, depending on which way the comparison is written.
 */
function monthRange(month?: string): { from: Date; to: Date; month: string } {
  const now = new Date();
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();

  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 1);
  return { from, to, month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}` };
}

interface PersonRow {
  company_membership_id: string;
  person_name: string;
  job_title: string | null;
  approved_minutes: number;
  submitted_minutes: number;
  draft_minutes: number;
  entry_count: number;
}

interface SiteRow {
  site_id: string;
  site_name: string;
  project_name: string | null;
  approved_minutes: number;
  pending_minutes: number;
  people_count: number;
}

/**
 * @param siteIds Work locations to report on; empty or omitted means all of
 *   them (#77). The manager asked for both — everything for accounting, a
 *   chosen few for a client — and one is the array of length one, so there is
 *   no single-location mode to build separately.
 */
export async function getWorkedHoursReport(month?: string, siteIds: string[] = []): Promise<WorkedHoursReport> {
  await requireActiveCompany();
  const range = monthRange(month);
  const supabase = await createClient();

  // Both functions are security invoker, so the caller's own RLS decides which
  // rows they see. There is deliberately no company filter here — adding one
  // would imply the isolation depends on this call getting it right.
  //
  // The same reasoning covers the filter: it narrows what RLS already allowed
  // and can never widen it, so an id from another company returns nothing
  // rather than that company's hours. Null, not an empty array, for "all" —
  // the functions accept both, but null is what says "no filter" at a glance
  // when this shows up in a query log.
  const params = {
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_site_ids: siteIds.length ? siteIds : null,
  };
  const [{ data: personRows }, { data: siteRows }] = await Promise.all([
    supabase.rpc("worked_hours_by_person", params),
    supabase.rpc("worked_hours_by_site", params),
  ]);

  const people: WorkedHoursPerson[] = ((personRows ?? []) as PersonRow[]).map((row) => ({
    membershipId: row.company_membership_id,
    name: row.person_name,
    jobTitle: row.job_title,
    approvedMinutes: Number(row.approved_minutes),
    submittedMinutes: Number(row.submitted_minutes),
    draftMinutes: Number(row.draft_minutes),
    entryCount: Number(row.entry_count),
  }));

  const sites: WorkedHoursSite[] = ((siteRows ?? []) as SiteRow[]).map((row) => ({
    siteId: row.site_id,
    siteName: row.site_name,
    projectName: row.project_name,
    approvedMinutes: Number(row.approved_minutes),
    pendingMinutes: Number(row.pending_minutes),
    peopleCount: Number(row.people_count),
  }));

  return {
    from: range.from.toISOString(),
    to: range.to.toISOString(),
    month: range.month,
    people,
    sites,
    siteIds,
    totals: {
      approvedMinutes: people.reduce((sum, person) => sum + person.approvedMinutes, 0),
      submittedMinutes: people.reduce((sum, person) => sum + person.submittedMinutes, 0),
      draftMinutes: people.reduce((sum, person) => sum + person.draftMinutes, 0),
    },
  };
}
