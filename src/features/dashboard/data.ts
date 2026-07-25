import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany, requireAuthenticatedSession } from "@/src/application/session/server";
import type { DashboardKpi, RecentTimesheet, TeamActivityItem, TimesheetStatus, WeeklyHoursEntry } from "@/lib/types/dashboard";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1) - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function workedMinutes(startsAt: string, endsAt: string, breakMinutes: number): number {
  const minutes = Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000);
  return Math.max(0, minutes - breakMinutes);
}
function toTimesheetStatus(status: string): TimesheetStatus {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}
function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} days ago`;
}

interface EntryRow { starts_at: string; ends_at: string; break_minutes: number; status: string }
interface TimesheetRow {
  id: string; status: string; submitted_at: string | null; period_end: string;
  users: RelatedOne<{ name: string }>;
  timesheet_entries: { starts_at: string; ends_at: string; break_minutes: number; projects: RelatedOne<{ name: string }> }[] | null;
}
interface ProjectUpdateRow { id: string; name: string; updated_at: string }

export async function getPendingApprovalsCount(): Promise<number> {
  const session = await requireAuthenticatedSession();
  if (!session.activeCompany) return 0;
  const companyId = session.activeCompany.id;
  const supabase = await createClient();
  const { count } = await supabase.from("timesheet_entries").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "submitted");
  return count ?? 0;
}

export async function getDashboardOverview(): Promise<{
  kpis: DashboardKpi[]; weeklyHours: WeeklyHoursEntry[]; teamActivities: TeamActivityItem[]; recentTimesheets: RecentTimesheet[];
}> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const weekStart = mondayOf(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const weekEndKey = toDateKey(weekDays[6]);
  const weekStartKey = toDateKey(weekStart);

  const [
    { count: activeEmployees },
    { count: activeProjects },
    { data: weekEntries },
    { count: pendingApprovals },
    { data: timesheetRows },
    { data: recentProjects },
  ] = await Promise.all([
    supabase.from("employee_records").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("employment_status", "active"),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active"),
    supabase.from("timesheet_entries").select("starts_at,ends_at,break_minutes,status").eq("company_id", companyId).gte("starts_at", weekStartKey).lte("starts_at", weekEndKey),
    supabase.from("timesheet_entries").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "submitted"),
    supabase
      .from("timesheets")
      .select("id,status,submitted_at,period_end,users!timesheets_user_id_fkey(name),timesheet_entries(starts_at,ends_at,break_minutes,projects(name))")
      .eq("company_id", companyId)
      .order("period_end", { ascending: false })
      .limit(5),
    supabase.from("projects").select("id,name,updated_at").eq("company_id", companyId).order("updated_at", { ascending: false }).limit(5),
  ]);

  const entries = (weekEntries ?? []) as EntryRow[];
  const totalWeekMinutes = entries.reduce((sum, row) => sum + workedMinutes(row.starts_at, row.ends_at, row.break_minutes), 0);

  const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
  const fullDayFormatter = new Intl.DateTimeFormat("en", { weekday: "long" });
  const weeklyHours: WeeklyHoursEntry[] = weekDays.map((day) => {
    const key = toDateKey(day);
    const minutes = entries.filter((row) => toDateKey(new Date(row.starts_at)) === key).reduce((sum, row) => sum + workedMinutes(row.starts_at, row.ends_at, row.break_minutes), 0);
    return { day: dayFormatter.format(day), fullDay: fullDayFormatter.format(day), hours: Math.round((minutes / 60) * 10) / 10 };
  });

  const kpis: DashboardKpi[] = [
    { id: "hours", label: "Hours This Week", value: `${Math.round((totalWeekMinutes / 60) * 10) / 10}h`, comparison: "Company-wide, current week", state: "neutral", icon: "clock" },
    { id: "employees", label: "Active Employees", value: String(activeEmployees ?? 0), comparison: "Current company", state: "neutral", icon: "users" },
    { id: "approvals", label: "Pending Approvals", value: String(pendingApprovals ?? 0), comparison: (pendingApprovals ?? 0) > 0 ? "Needs your attention" : "All caught up", state: (pendingApprovals ?? 0) > 0 ? "attention" : "positive", icon: "approval" },
    { id: "projects", label: "Active Projects", value: String(activeProjects ?? 0), comparison: "Current company", state: "neutral", icon: "projects" },
  ];

  const recentTimesheets: RecentTimesheet[] = ((timesheetRows ?? []) as TimesheetRow[]).flatMap((row) => {
    const user = first(row.users);
    if (!user) return [];
    const rowEntries = row.timesheet_entries ?? [];
    const hours = Math.round((rowEntries.reduce((sum, entry) => sum + workedMinutes(entry.starts_at, entry.ends_at, entry.break_minutes), 0) / 60) * 10) / 10;
    const projectNames = [...new Set(rowEntries.flatMap((entry) => { const project = first(entry.projects); return project ? [project.name] : []; }))];
    const project = projectNames.length === 0 ? "—" : projectNames.length === 1 ? projectNames[0] : "Multiple projects";
    return [{ id: row.id, employee: user.name, project, hours, date: row.period_end, status: toTimesheetStatus(row.status) }];
  });

  const submissionActivities: (TeamActivityItem & { occurredAt: string })[] = ((timesheetRows ?? []) as TimesheetRow[]).flatMap((row) => {
    const user = first(row.users);
    if (!user || !row.submitted_at) return [];
    const type = row.status === "approved" ? "timesheet_approved" : "timesheet_submitted";
    return [{ id: `timesheet-${row.id}`, person: user.name, action: row.status === "approved" ? "had a timesheet approved" : "submitted a timesheet", context: `Week ending ${row.period_end}`, time: timeAgo(row.submitted_at), type, occurredAt: row.submitted_at }];
  });
  const projectActivities: (TeamActivityItem & { occurredAt: string })[] = ((recentProjects ?? []) as ProjectUpdateRow[]).map((row) => ({
    id: `project-${row.id}`, person: "Team", action: "updated project", context: row.name, time: timeAgo(row.updated_at), type: "project_updated", occurredAt: row.updated_at,
  }));
  // Sort by the raw timestamp, not the already-formatted "N min/hr/days ago"
  // string — comparing those strings lexicographically would not produce
  // chronological order.
  const teamActivities: TeamActivityItem[] = [...submissionActivities, ...projectActivities]
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, 5)
    .map((activity) => ({ id: activity.id, person: activity.person, action: activity.action, context: activity.context, time: activity.time, type: activity.type }));

  return { kpis, weeklyHours, teamActivities, recentTimesheets };
}
