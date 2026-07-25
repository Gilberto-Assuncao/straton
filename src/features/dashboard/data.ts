import "server-only";

import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany, requireAuthenticatedSession } from "@/src/application/session/server";
import type { DashboardKpi, RecentTimesheet, TeamActivityItem, TimesheetStatus, WeeklyHoursEntry } from "@/lib/types/dashboard";
import { getPayrollPeriodSummary } from "@/src/features/payroll/data";

const adminRoles = ["owner", "admin", "administrator"];
const managerRoles = [...adminRoles, "manager", "supervisor"];
const hrRoles = [...adminRoles, "hr", "finance", "accountant"];

export type DashboardRoleView = "supervisor" | "admin" | "hr";

export interface DashboardKpiCard {
  id: string; label: string; value: string; color: string; cta: string; ctaHref: string; trend: string; trendColor: string;
}
export interface DashboardAttentionItem {
  id: string; text: string; cta: string; ctaHref: string; accent: string;
}
export interface RoleDashboardOverview {
  roleView: DashboardRoleView | null;
  headline: string; subheadline: string; attentionTitle: string;
  kpis: DashboardKpiCard[];
  attention: DashboardAttentionItem[];
}

export async function getRoleDashboardOverview(): Promise<RoleDashboardOverview> {
  const session = await requireAuthenticatedSession();
  const roles = session.activeCompany?.roles ?? [];
  const isAdmin = roles.some((role) => adminRoles.includes(role));
  const isManager = roles.some((role) => managerRoles.includes(role));
  const isHr = roles.some((role) => hrRoles.includes(role));
  if (!isManager && !isHr) return { roleView: null, headline: "", subheadline: "", attentionTitle: "", kpis: [], attention: [] };
  const roleView: DashboardRoleView = isAdmin ? "admin" : isHr ? "hr" : "supervisor";

  const [t, locale] = await Promise.all([getTranslations("roleDashboard"), getLocale()]);
  const companyId = session.activeCompany!.id;
  const supabase = await createClient();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const [
    { count: pendingApprovals },
    { data: activeMembers },
    { data: todaysTimesheets },
    { count: totalTeams },
    { data: teamMembers },
    { count: pendingInvites },
  ] = await Promise.all([
    supabase.from("timesheet_entries").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "submitted"),
    supabase.from("employee_records").select("company_membership_id,company_memberships!inner(user_id)").eq("company_id", companyId).eq("employment_status", "active"),
    supabase.from("timesheets").select("user_id,timesheet_entries!inner(starts_at)").eq("company_id", companyId).gte("timesheet_entries.starts_at", todayStart.toISOString()).lte("timesheet_entries.starts_at", todayEnd.toISOString()),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "active"),
    supabase.from("team_memberships").select("team_id,company_memberships!inner(user_id)").eq("company_id", companyId).is("left_at", null),
    supabase.from("company_memberships").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "invited"),
  ]);

  type MemberRow = { company_membership_id: string; company_memberships: { user_id: string } | { user_id: string }[] | null };
  const first = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const activeUserIds = new Set(((activeMembers ?? []) as MemberRow[]).flatMap((row) => { const m = first(row.company_memberships); return m ? [m.user_id] : []; }));
  const checkedInUserIds = new Set(((todaysTimesheets ?? []) as { user_id: string }[]).map((row) => row.user_id));
  const noCheckinToday = [...activeUserIds].filter((id) => !checkedInUserIds.has(id)).length;

  type TeamMemberRow = { team_id: string; company_memberships: { user_id: string } | { user_id: string }[] | null };
  const teamActiveToday = new Set(((teamMembers ?? []) as TeamMemberRow[]).flatMap((row) => { const m = first(row.company_memberships); return m && checkedInUserIds.has(m.user_id) ? [row.team_id] : []; })).size;

  const payrollLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date());

  const headlines: Record<DashboardRoleView, { headline: string; subheadline: string }> = {
    supervisor: { headline: t("headlineSupervisor"), subheadline: t("subheadlineSupervisor") },
    admin: { headline: t("headlineAdmin"), subheadline: t("subheadlineAdmin") },
    hr: { headline: t("headlineHr"), subheadline: t("subheadlineHr", { period: payrollLabel }) },
  };

  const kpis: DashboardKpiCard[] = [];
  const attention: DashboardAttentionItem[] = [];

  if (isManager) {
    kpis.push({ id: "approvals", label: t("kpiApprovalsLabel"), value: String(pendingApprovals ?? 0), color: (pendingApprovals ?? 0) > 0 ? "#F59E0B" : "#4ADE80", cta: t("kpiApprovalsCta"), ctaHref: "/dashboard/timesheets", trend: (pendingApprovals ?? 0) > 0 ? t("kpiApprovalsTrendAttention") : t("kpiApprovalsTrendOk"), trendColor: (pendingApprovals ?? 0) > 0 ? "#F59E0B" : "#4ADE80" });
    kpis.push({ id: "no-checkin", label: t("kpiNoCheckinLabel"), value: String(noCheckinToday), color: noCheckinToday > 0 ? "#F87171" : "#4ADE80", cta: t("kpiNoCheckinCta"), ctaHref: "/dashboard/map", trend: t("kpiNoCheckinTrend", { active: activeUserIds.size }), trendColor: "#94A3B8" });
    if ((pendingApprovals ?? 0) > 0) attention.push({ id: "att-approvals", text: t("attentionApprovals", { count: pendingApprovals ?? 0 }), cta: t("kpiApprovalsCta"), ctaHref: "/dashboard/timesheets", accent: "#F59E0B" });
    if (noCheckinToday > 0) attention.push({ id: "att-no-checkin", text: t("attentionNoCheckin", { count: noCheckinToday }), cta: t("kpiNoCheckinCta"), ctaHref: "/dashboard/map", accent: "#F87171" });
  }
  if (isAdmin) {
    kpis.push({ id: "teams", label: t("kpiTeamsLabel"), value: `${teamActiveToday}/${totalTeams ?? 0}`, color: "#4ADE80", cta: t("kpiTeamsCta"), ctaHref: "/dashboard/teams", trend: (totalTeams ?? 0) > 0 ? t("kpiTeamsTrend", { pct: Math.round((teamActiveToday / (totalTeams ?? 1)) * 100) }) : t("kpiTeamsTrendEmpty"), trendColor: "#94A3B8" });
    kpis.push({ id: "invites", label: t("kpiInvitesLabel"), value: String(pendingInvites ?? 0), color: (pendingInvites ?? 0) > 0 ? "#F59E0B" : "#4ADE80", cta: t("kpiInvitesCta"), ctaHref: "/dashboard/employees", trend: (pendingInvites ?? 0) > 0 ? t("kpiInvitesTrendPending") : t("kpiInvitesTrendNone"), trendColor: "#94A3B8" });
    if ((pendingInvites ?? 0) > 0) attention.push({ id: "att-invites", text: t("attentionInvites", { count: pendingInvites ?? 0 }), cta: t("kpiInvitesCta"), ctaHref: "/dashboard/employees", accent: "#F59E0B" });
  }
  if (isHr) {
    const [{ totalMinutes, employees }, excessShifts] = await Promise.all([
      getPayrollPeriodSummary(),
      getExcessShiftsCount(),
    ]);
    const hours = `${Math.floor(totalMinutes / 60)}h`;
    kpis.push({ id: "payroll-hours", label: t("kpiPayrollLabel"), value: hours, color: "#F1F5F9", cta: t("kpiPayrollCta"), ctaHref: "/dashboard/finance", trend: t("kpiPayrollTrend", { count: employees.length }), trendColor: "#94A3B8" });
    kpis.push({ id: "excess-shifts", label: t("kpiExcessLabel"), value: String(excessShifts), color: excessShifts > 0 ? "#F87171" : "#4ADE80", cta: t("kpiExcessCta"), ctaHref: "/dashboard/finance", trend: excessShifts > 0 ? t("kpiExcessTrend") : t("kpiExcessTrendNone"), trendColor: excessShifts > 0 ? "#F59E0B" : "#4ADE80" });
    if (excessShifts > 0) attention.push({ id: "att-excess", text: t("attentionExcess", { count: excessShifts }), cta: t("kpiExcessCta"), ctaHref: "/dashboard/finance", accent: "#F59E0B" });
  }

  const { headline, subheadline } = headlines[roleView];
  return { roleView, headline, subheadline, attentionTitle: t("attentionTitle"), kpis, attention };
}

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

export async function getExcessShiftsCount(): Promise<number> {
  const session = await requireAuthenticatedSession();
  if (!session.activeCompany) return 0;
  const companyId = session.activeCompany.id;
  const supabase = await createClient();
  const { periodStart, periodEnd } = await getPayrollPeriodSummary();
  const { data: periodEntries } = await supabase.from("timesheets").select("timesheet_entries!inner(starts_at,ends_at,break_minutes)").eq("company_id", companyId).eq("status", "approved");
  type PeriodEntryRow = { timesheet_entries: { starts_at: string; ends_at: string; break_minutes: number }[] };
  return ((periodEntries ?? []) as PeriodEntryRow[]).flatMap((row) => row.timesheet_entries).filter((entry) => {
    const key = entry.starts_at.slice(0, 10);
    if (key < periodStart || key > periodEnd) return false;
    const minutes = Math.round((new Date(entry.ends_at).getTime() - new Date(entry.starts_at).getTime()) / 60000) - entry.break_minutes;
    return minutes > 600;
  }).length;
}

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
