import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";

import type { ClientOption, SiteAddress, SiteRecord } from "./types";

export type { SiteAddress, SiteRecord, ClientOption } from "./types";
export { SITE_STATUSES } from "./types";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

interface SiteRow {
  id: string; name: string; reference: string | null; status: string | null;
  address: SiteAddress | null; latitude: number | null; longitude: number | null;
  po_number: string | null; cost_center: string | null; project_id: string | null;
  client_company_id: string | null;
  starts_at: string | null; ends_at: string | null;
  projects: RelatedOne<{ name: string }>;
  companies: RelatedOne<{ name: string }>;
}

function toRecord(row: SiteRow): SiteRecord {
  const project = first(row.projects);
  return {
    id: row.id, name: row.name, reference: row.reference, status: row.status ?? "active",
    address: row.address ?? {}, latitude: row.latitude, longitude: row.longitude,
    poNumber: row.po_number, costCenter: row.cost_center,
    projectId: row.project_id, projectName: project?.name ?? null,
    clientCompanyId: row.client_company_id, clientName: first(row.companies)?.name ?? null,
    startsAt: row.starts_at, endsAt: row.ends_at,
  };
}

const SELECT = "id,name,reference,status,address,latitude,longitude,po_number,cost_center,project_id,client_company_id,starts_at,ends_at,projects(name),companies!sites_client_company_id_fkey(name)";

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

export async function getProjectOptions(): Promise<{ id: string; name: string }[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id,name").eq("company_id", companyId).order("name");
  return (data ?? []) as { id: string; name: string }[];
}

// --- Site dashboard (#30) ------------------------------------------------
//
// One query set per site, so the page answers "what is happening at this
// place?" without the user filtering four other screens by site.

export type SitePresence = { userId: string; name: string; startedAt: string; latitude: number | null; longitude: number | null };
export type SiteHoursEntry = { id: string; person: string; date: string; minutes: number; status: string; task: string | null };
export type SiteReportSummary = { id: string; date: string; worker: string; activity: string | null; status: string };
export type SiteTeamMember = { membershipId: string; name: string; jobTitle: string | null; companyName: string };

export interface SiteDashboard {
  presentToday: SitePresence[];
  hours: { entries: SiteHoursEntry[]; totalMinutes: number; pendingApproval: number };
  reports: SiteReportSummary[];
  team: SiteTeamMember[];
}

interface PresenceRow {
  starts_at: string; start_latitude: number | null; start_longitude: number | null;
  timesheets: RelatedOne<{ user_id: string; users: RelatedOne<{ name: string }> }>;
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

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ data: presenceRows }, { data: hourRows }, { data: reportRows }, { data: siteRow }] = await Promise.all([
    supabase
      .from("timesheet_entries")
      .select("starts_at,start_latitude,start_longitude,timesheets!inner(user_id,users!timesheets_user_id_fkey(name))")
      .eq("company_id", companyId).eq("site_id", siteId)
      .gte("starts_at", todayStart.toISOString())
      .not("start_latitude", "is", null)
      .order("starts_at", { ascending: false }),
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
    supabase.from("sites").select("project_id").eq("company_id", companyId).eq("id", siteId).maybeSingle(),
  ]);

  // Newest first, so the first row per user is their latest check-in.
  const seen = new Set<string>();
  const presentToday: SitePresence[] = [];
  for (const row of (presenceRows ?? []) as PresenceRow[]) {
    const timesheet = first(row.timesheets);
    const user = timesheet ? first(timesheet.users) : null;
    if (!timesheet || !user || seen.has(timesheet.user_id)) continue;
    seen.add(timesheet.user_id);
    presentToday.push({
      userId: timesheet.user_id, name: user.name, startedAt: row.starts_at,
      latitude: row.start_latitude, longitude: row.start_longitude,
    });
  }

  let totalMinutes = 0;
  let pendingApproval = 0;
  const entries: SiteHoursEntry[] = ((hourRows ?? []) as HoursRow[]).flatMap((row) => {
    const timesheet = first(row.timesheets);
    const user = timesheet ? first(timesheet.users) : null;
    if (!user) return [];
    const minutes = Math.max(0, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000) - row.break_minutes);
    totalMinutes += minutes;
    if (row.status === "submitted") pendingApproval += 1;
    return [{
      id: row.id, person: user.name, date: row.starts_at.slice(0, 10),
      minutes, status: row.status, task: first(row.tasks)?.name ?? null,
    }];
  });

  const reports: SiteReportSummary[] = ((reportRows ?? []) as ReportRow[]).map((row) => ({
    id: row.id, date: row.report_date, activity: row.activity,
    status: row.status, worker: first(row.users)?.name ?? "",
  }));

  // Whoever is on the site's project. A site without a project has no team of
  // its own — the work is assigned at project level.
  let team: SiteTeamMember[] = [];
  const projectId = (siteRow as { project_id: string | null } | null)?.project_id;
  if (projectId) {
    const { data: memberRows } = await supabase
      .from("project_memberships")
      .select("company_membership_id,company_memberships!inner(job_title,users!company_memberships_user_id_fkey(name),companies!inner(name))")
      .eq("project_id", projectId)
      .is("left_at", null);

    type MemberRow = {
      company_membership_id: string;
      company_memberships: RelatedOne<{ job_title: string | null; users: RelatedOne<{ name: string }>; companies: RelatedOne<{ name: string }> }>;
    };
    team = ((memberRows ?? []) as MemberRow[]).flatMap((row) => {
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
  }

  return { presentToday, hours: { entries, totalMinutes, pendingApproval }, reports, team };
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
