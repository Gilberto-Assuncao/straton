import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type { DailySummary, EntryStatus, Project, Task, TimeEntry, WeeklySummary } from "@/lib/types/time";

const WEEKLY_TARGET_MINUTES = 2400;

type RelatedOne<T> = T | T[] | null;
interface EntryRow {
  id: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  projects: RelatedOne<{ id: string; name: string }>;
  tasks: RelatedOne<{ id: string; name: string }>;
}

function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }
function statusLabel(status: EntryRow["status"]): EntryStatus {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}
function workedMinutes(row: EntryRow): number {
  const minutes = Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000);
  return Math.max(0, minutes - row.break_minutes);
}
function dateKey(iso: string): string {
  // "Today" must be the server's local calendar day, not the UTC day —
  // toISOString() would shift the boundary for any timezone ahead of UTC
  // (e.g. Belgium/CEST, UTC+2), same class of bug fixed in timesheets/data.ts.
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

export interface TrackerSite { id: string; name: string; projectId: string | null }

/**
 * The site the person is expected to be at right now, from the agenda.
 *
 * Pre-filling this is the difference between a site selector that gets used and
 * one that gets left on its default. Someone standing on a roof with gloves on
 * is not going to scroll a list before starting work — but if the schedule
 * already says where they are, nobody has to.
 */
export interface CurrentAssignment { assignmentId: string; title: string; siteId: string | null; projectId: string | null }

/**
 * A session that has been running past any plausible working day (#60).
 *
 * Twelve hours, because a long day on site is ten and nobody works thirteen by
 * accident. Past that the likeliest explanation is that someone pressed Start
 * and went home, and turning that into thirteen paid hours in silence is the
 * failure this threshold exists to catch.
 */
export const STALE_SESSION_HOURS = 12;

/** The clock that is running right now, if there is one. */
export interface OpenSession {
  id: string;
  startedAt: string;
  /**
   * Computed on the server so the component never reads the clock during
   * render — the client ticks up from here. React would otherwise flag the
   * impurity, and the first paint would disagree with the server's.
   */
  elapsedSeconds: number;
  projectId: string | null;
  taskId: string | null;
  siteId: string | null;
  notes: string;
  /** Running longer than a working day, and never confirmed by the person. */
  isStale: boolean;
}

/**
 * The open session for whoever is asking, from the database rather than a tab.
 *
 * This is the whole point of #60: before it, a running timer existed only in
 * React state, so locking the phone lost the day with no error and no record.
 * Reading it back here is what makes a clock-in survive the device.
 */
export async function getOpenSession(): Promise<OpenSession | null> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data } = await supabase
    .from("time_sessions")
    .select("id,started_at,project_id,task_id,site_id,notes,confirmed_at")
    .eq("company_id", companyId)
    .eq("user_id", session.user.id)
    .is("ended_at", null)
    .maybeSingle();
  if (!data) return null;

  const startedAt = new Date(data.started_at as string);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));

  return {
    id: data.id as string,
    startedAt: data.started_at as string,
    elapsedSeconds,
    projectId: (data.project_id as string | null) ?? null,
    taskId: (data.task_id as string | null) ?? null,
    siteId: (data.site_id as string | null) ?? null,
    notes: (data.notes as string | null) ?? "",
    isStale: !data.confirmed_at && elapsedSeconds > STALE_SESSION_HOURS * 3600,
  };
}

export async function getTimeTrackingOverview(): Promise<{
  projects: Project[]; tasks: Task[]; sites: TrackerSite[]; currentAssignment: CurrentAssignment | null;
  recentEntries: TimeEntry[]; todaySummary: DailySummary; weeklySummary: WeeklySummary;
}> {
  const { session, companyId } = await requireActiveCompany();
  const userId = session.user.id;
  const membershipId = session.activeCompany?.membershipId ?? "";
  const supabase = await createClient();

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // A generous window around now: someone clocking in ten minutes early is the
  // normal case, and a job that started this morning is still the job they are
  // on at two in the afternoon.
  const from = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const [{ data: projectRows }, { data: taskRows }, { data: siteRows }, { data: assignmentRows }, { data: entryRows, error }] = await Promise.all([
    supabase.from("projects").select("id,name").eq("company_id", companyId).order("name"),
    supabase.from("tasks").select("id,name").eq("company_id", companyId).eq("status", "active").order("name"),
    supabase.from("sites").select("id,name,project_id").eq("company_id", companyId).eq("status", "active").order("name"),
    supabase
      .from("assignments")
      .select("id,title,site_id,project_id,starts_at,assignment_assignees!inner(company_membership_id)")
      .eq("company_id", companyId)
      .eq("assignment_assignees.company_membership_id", membershipId)
      .lte("starts_at", to)
      .gte("ends_at", from)
      .order("starts_at")
      .limit(1),
    supabase
      .from("timesheet_entries")
      .select("id,starts_at,ends_at,break_minutes,status,projects(id,name),tasks(id,name),timesheets!inner(user_id)")
      .eq("company_id", companyId)
      .eq("timesheets.user_id", userId)
      .gte("starts_at", weekStart.toISOString())
      .order("starts_at", { ascending: false }),
  ]);
  if (error) throw new Error("Unable to load time tracking entries.");

  const projects: Project[] = projectRows ?? [];
  const tasks: Task[] = taskRows ?? [];
  const sites: TrackerSite[] = ((siteRows ?? []) as { id: string; name: string; project_id: string | null }[]).map((row) => ({
    id: row.id, name: row.name, projectId: row.project_id,
  }));

  type AssignmentRow = { id: string; title: string; site_id: string | null; project_id: string | null };
  const assignment = ((assignmentRows ?? []) as AssignmentRow[])[0];
  const currentAssignment: CurrentAssignment | null = assignment
    ? { assignmentId: assignment.id, title: assignment.title, siteId: assignment.site_id, projectId: assignment.project_id }
    : null;
  const rows = (entryRows ?? []) as unknown as EntryRow[];

  const recentEntries: TimeEntry[] = rows.slice(0, 10).flatMap((row) => {
    const project = first(row.projects);
    const task = first(row.tasks);
    if (!project || !task) return [];
    return [{ id: row.id, project, task, durationMinutes: workedMinutes(row), date: formatDate(row.starts_at), status: statusLabel(row.status) }];
  });

  const today = dateKey(new Date().toISOString());
  const todayRows = rows.filter((row) => dateKey(row.starts_at) === today);
  const todaySummary: DailySummary = {
    workedMinutes: todayRows.reduce((sum, row) => sum + workedMinutes(row), 0),
    breakMinutes: todayRows.reduce((sum, row) => sum + row.break_minutes, 0),
    sessions: todayRows.length,
  };
  const weeklySummary: WeeklySummary = {
    workedMinutes: rows.reduce((sum, row) => sum + workedMinutes(row), 0),
    targetMinutes: WEEKLY_TARGET_MINUTES,
  };

  return { projects, tasks, sites, currentAssignment, recentEntries, todaySummary, weeklySummary };
}
