import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany, requireAuthenticatedSession } from "@/src/application/session/server";

import type { ClientOption, SiteAddress, SitePriority, SiteRecord } from "./types";

export type { SiteAddress, SiteRecord, ClientOption, SiteAreaRecord } from "./types";
export { SITE_STATUSES, SITE_PRIORITIES } from "./types";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

interface SiteRow {
  id: string; name: string; reference: string | null; status: string | null;
  address: SiteAddress | null; latitude: number | null; longitude: number | null;
  po_number: string | null; cost_center: string | null;
  client_company_id: string | null;
  starts_at: string | null; ends_at: string | null;
  description: string | null; priority: string | null;
  estimated_hours: number | null; budget_amount: number | null;
  budget_spent: number | null; budget_currency: string | null;
  companies: RelatedOne<{ name: string }>;
}

function toRecord(row: SiteRow): SiteRecord {
  return {
    id: row.id, name: row.name, reference: row.reference, status: row.status ?? "active",
    address: row.address ?? {}, latitude: row.latitude, longitude: row.longitude,
    poNumber: row.po_number, costCenter: row.cost_center,
    clientCompanyId: row.client_company_id, clientName: first(row.companies)?.name ?? null,
    startsAt: row.starts_at, endsAt: row.ends_at,
    description: row.description,
    priority: (row.priority as SitePriority | null) ?? "medium",
    estimatedHours: row.estimated_hours,
    budgetAmount: row.budget_amount,
    // The column is `not null default 0`, so a null here means the row came
    // back without it, not that nothing was spent.
    budgetSpent: row.budget_spent ?? 0,
    budgetCurrency: row.budget_currency ?? "EUR",
  };
}

const SELECT = "id,name,reference,status,address,latitude,longitude,po_number,cost_center,client_company_id,starts_at,ends_at,description,priority,estimated_hours,budget_amount,budget_spent,budget_currency,companies!sites_client_company_id_fkey(name)";

export async function getSites(): Promise<SiteRecord[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").select(SELECT).eq("company_id", companyId).order("name");
  if (error) throw new Error("Unable to load sites.");
  return ((data ?? []) as SiteRow[]).map(toRecord);
}

export async function getSiteById(siteId: string): Promise<SiteRecord | null> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select(SELECT).eq("company_id", companyId).eq("id", siteId).maybeSingle();
  return data ? toRecord(data as SiteRow) : null;
}

// --- Site dashboard (#30) ------------------------------------------------
//
// One query set per site, so the page answers "what is happening at this
// place?" without the user filtering four other screens by site.

/**
 * Who is clocked in at this site right now (#5, #61).
 *
 * Was "whoever recorded a coordinate here today", read from finished entries —
 * so it showed people who had already gone home, and it did so by keeping their
 * phone's position. Now it reads open sessions: the person is here because the
 * clock is running against this chantier, which is what presence means.
 */
export type SitePresence = { userId: string; name: string; startedAt: string };
export type SiteHoursEntry = { id: string; person: string; date: string; minutes: number; status: string; task: string | null };

/**
 * Worked minutes broken down by subdivision (#77).
 *
 * The payoff for the whole subdivision chain: it is the number that makes
 * dividing a location worth doing. `areaId` is null for the unattributed row —
 * hours booked before the location was divided, or by somebody who did not say
 * which floor — and that row is kept rather than dropped, so the parts always
 * add up to the location's total.
 */
export type SiteAreaHours = {
  areaId: string | null;
  name: string | null;
  isDefault: boolean;
  minutes: number;
  peopleCount: number;
};
export type SiteReportSummary = { id: string; date: string; worker: string; activity: string | null; status: string };
export type SiteTeamMember = { membershipId: string; name: string; jobTitle: string | null; companyName: string };

export interface SiteDashboard {
  presentToday: SitePresence[];
  /**
   * `entries` is the 50 most recent, for the list. `totalMinutes` and
   * `pendingApproval` are the real figures for the whole location.
   *
   * They used to be derived from the same 50 rows, so a location with more
   * history than that reported a total that was silently the tail of it — and
   * the tab called it "Total". Nothing on screen said the number was a
   * sample. Now the sum comes from `worked_hours_by_site`, which aggregates in
   * SQL, and the count from an exact `head` count.
   */
  hours: { entries: SiteHoursEntry[]; totalMinutes: number; pendingApproval: number; byArea: SiteAreaHours[] };
  reports: SiteReportSummary[];
  team: SiteTeamMember[];
}

/**
 * Wide enough to mean "all of it".
 *
 * `worked_hours_by_site` takes a period because every other caller reports on
 * a month; this one wants the lifetime of the location, and a range that
 * cannot plausibly be reached is how you ask for that without a second
 * function. Half-open, matching the report: `>= from` and `< to`.
 */
const ALL_TIME = { from: "2000-01-01T00:00:00.000Z", to: "2100-01-01T00:00:00.000Z" };

interface PresenceRow {
  started_at: string; user_id: string;
  users: RelatedOne<{ name: string }>;
}
interface HoursRow {
  id: string; starts_at: string; ends_at: string; break_minutes: number; status: string;
  timesheets: RelatedOne<{ users: RelatedOne<{ name: string }> }>;
  tasks: RelatedOne<{ name: string }>;
}
interface ReportRow {
  id: string; report_date: string; activity: string | null; status: string;
  users: RelatedOne<{ name: string }>;
}

export async function getSiteDashboard(siteId: string): Promise<SiteDashboard> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [
    { data: presenceRows },
    { data: hourRows },
    { data: reportRows },
    { data: totalRows },
    { count: pendingCount },
    { data: areaHourRows },
  ] = await Promise.all([
    supabase
      .from("time_sessions")
      .select("started_at,user_id,users!time_sessions_user_id_fkey(name)")
      .eq("company_id", companyId).eq("site_id", siteId)
      .is("ended_at", null)
      .order("started_at", { ascending: true }),
    supabase
      .from("timesheet_entries")
      .select("id,starts_at,ends_at,break_minutes,status,timesheets!inner(users!timesheets_user_id_fkey(name)),tasks(name)")
      .eq("company_id", companyId).eq("site_id", siteId)
      .order("starts_at", { ascending: false })
      .limit(50),
    supabase
      .from("operational_reports")
      .select("id,report_date,activity,status,users!operational_reports_worker_id_fkey(name)")
      .eq("company_id", companyId).eq("site_id", siteId)
      .order("report_date", { ascending: false })
      .limit(20),
    // Security invoker, so RLS still decides which entries exist at all and
    // naming another company's location returns nothing rather than their
    // hours — the same argument as the report it was built for (#81).
    supabase.rpc("worked_hours_by_site", {
      p_from: ALL_TIME.from,
      p_to: ALL_TIME.to,
      p_site_ids: [siteId],
    }),
    supabase
      .from("timesheet_entries")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId).eq("site_id", siteId)
      .eq("status", "submitted"),
    // The same function the company report uses, asked about one location
    // (#77). It takes a set because the report needs a set, and one is an
    // array of length one — building a single-location variant first is how a
    // screen ends up unable to express "these three".
    supabase.rpc("worked_hours_by_subdivision", {
      p_from: ALL_TIME.from,
      p_to: ALL_TIME.to,
      p_site_ids: [siteId],
    }),
  ]);

  // One row per person: the partial unique index already guarantees a single
  // open session each, so this only guards against a future relaxation.
  const presentToday: SitePresence[] = [];
  const seen = new Set<string>();
  for (const row of (presenceRows ?? []) as PresenceRow[]) {
    const user = first(row.users);
    if (!user || seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    presentToday.push({ userId: row.user_id, name: user.name, startedAt: row.started_at });
  }

  const entries: SiteHoursEntry[] = ((hourRows ?? []) as HoursRow[]).flatMap((row) => {
    const timesheet = first(row.timesheets);
    const user = timesheet ? first(timesheet.users) : null;
    if (!user) return [];
    const minutes = Math.max(0, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000) - row.break_minutes);
    return [{
      id: row.id, person: user.name, date: row.starts_at.slice(0, 10),
      minutes, status: row.status, task: first(row.tasks)?.name ?? null,
    }];
  });

  // At most one row: the function groups by site and it was asked for one.
  // Approved plus pending is every entry, because the function splits on
  // `status = 'approved'` and nothing falls outside the two halves.
  const totals = ((totalRows ?? []) as { approved_minutes: number; pending_minutes: number }[])[0];
  const totalMinutes = totals ? Number(totals.approved_minutes) + Number(totals.pending_minutes) : 0;
  const pendingApproval = pendingCount ?? 0;

  type AreaHoursRow = {
    site_area_id: string | null; area_name: string | null; is_default: boolean;
    approved_minutes: number; pending_minutes: number; people_count: number;
  };
  const byArea: SiteAreaHours[] = ((areaHourRows ?? []) as AreaHoursRow[]).map((row) => ({
    areaId: row.site_area_id,
    name: row.area_name,
    isDefault: row.is_default,
    // Approved and pending together, matching the total above. Splitting them
    // here would let the subdivisions sum to less than the location and give
    // nobody a reason why.
    minutes: Number(row.approved_minutes) + Number(row.pending_minutes),
    peopleCount: Number(row.people_count),
  }));

  const reports: SiteReportSummary[] = ((reportRows ?? []) as ReportRow[]).map((row) => ({
    id: row.id, date: row.report_date, activity: row.activity,
    status: row.status, worker: first(row.users)?.name ?? "",
  }));

  /*
   * The crew allocated to this location (#77).
   *
   * Was "whoever is a member of the site's project", which meant a location
   * with no project had no team — and the screen said so as if that were a
   * fact about the chantier rather than about the schema. People are employed
   * by a company and allocated to a place; this reads the allocation.
   */
  const { data: crewRows } = await supabase
    .from("site_crew")
    .select("company_membership_id,company_memberships!inner(job_title,users!company_memberships_user_id_fkey(name),companies!inner(name))")
    .eq("site_id", siteId)
    .is("left_at", null);

  type CrewRow = {
    company_membership_id: string;
    company_memberships: RelatedOne<{ job_title: string | null; users: RelatedOne<{ name: string }>; companies: RelatedOne<{ name: string }> }>;
  };
  const team: SiteTeamMember[] = ((crewRows ?? []) as CrewRow[]).flatMap((row) => {
    const membership = first(row.company_memberships);
    const user = membership ? first(membership.users) : null;
    if (!membership || !user) return [];
    return [{
      membershipId: row.company_membership_id, name: user.name,
      jobTitle: membership.job_title,
      // Shown so a partner company's people are never mistaken for your own.
      companyName: first(membership.companies)?.name ?? "",
    }];
  });

  return { presentToday, hours: { entries, totalMinutes, pendingApproval, byArea }, reports, team };
}

// Companies this one has an active relationship with — readable since the
// companies_read_related policy (migration 202608010001). Before that a
// client was invisible to the company that had it.
export async function getClientOptions(): Promise<ClientOption[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("company_relationships")
    .select("source_company_id,target_company_id")
    .eq("status", "active")
    .or(`source_company_id.eq.${companyId},target_company_id.eq.${companyId}`);

  const otherIds = [...new Set(((links ?? []) as { source_company_id: string; target_company_id: string }[])
    .map((row) => (row.source_company_id === companyId ? row.target_company_id : row.source_company_id)))];
  if (otherIds.length === 0) return [];

  const { data } = await supabase.from("companies").select("id,name,city").in("id", otherIds).order("name");
  return ((data ?? []) as { id: string; name: string; city: string | null }[])
    .map((row) => ({ id: row.id, name: row.name, city: row.city }));
}

/** One entry in the sidebar shortcut. */
export interface RecentWorkLocation {
  id: string;
  name: string;
}

/**
 * The work locations to put one click away (#76).
 *
 * A supervisor works at three or four places in a week and today has to walk
 * the whole list every time they switch. This is a shortcut, not a filter: the
 * click opens that location's page and changes nothing else. A context switch
 * — the whole app filtered to one location, like the company switcher — is the
 * version people get lost in, because they forget it is on and think their data
 * disappeared.
 *
 * Ordered by the most recent clock-in, and RLS decides whose clock-ins those
 * are: your own if you are a worker, the company's if you review hours. So the
 * same query answers "where have I been" and "where is the company working"
 * without either being asked for by name.
 *
 * Topped up with the locations that started most recently, because a company on
 * its first day has no clock-ins at all and a permanently empty shortcut is
 * indistinguishable from a broken one.
 */
export async function getRecentWorkLocations(limit = 5): Promise<RecentWorkLocation[]> {
  /*
   * Deliberately not `requireActiveCompany()`, which redirects to
   * /dashboard/companies/new when there is none.
   *
   * This runs in the dashboard layout, and that page lives inside the same
   * layout — so a newly registered person with no company yet would be
   * redirected to the page that redirects them again. An infinite loop on the
   * one screen where they would have fixed it.
   *
   * A sidebar shortcut has no business deciding where anybody goes.
   */
  const session = await requireAuthenticatedSession();
  const companyId = session.activeCompany?.id;
  if (!companyId) return [];

  const supabase = await createClient();

  const [{ data: sessions }, { data: sites }] = await Promise.all([
    supabase
      .from("time_sessions")
      .select("site_id,started_at,sites(id,name)")
      .eq("company_id", companyId)
      .not("site_id", "is", null)
      .order("started_at", { ascending: false })
      .limit(60),
    supabase
      .from("sites")
      .select("id,name,starts_at")
      .eq("company_id", companyId)
      .neq("status", "archived")
      .order("starts_at", { ascending: false, nullsFirst: false })
      .limit(limit),
  ]);

  const recent = new Map<string, RecentWorkLocation>();
  for (const row of (sessions ?? []) as { sites: { id: string; name: string } | { id: string; name: string }[] | null }[]) {
    const site = Array.isArray(row.sites) ? row.sites[0] : row.sites;
    if (site && !recent.has(site.id)) recent.set(site.id, { id: site.id, name: site.name });
    if (recent.size >= limit) break;
  }
  for (const site of (sites ?? []) as { id: string; name: string }[]) {
    if (recent.size >= limit) break;
    if (!recent.has(site.id)) recent.set(site.id, { id: site.id, name: site.name });
  }

  return [...recent.values()];
}
