import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type { ApprovalStatus, Timesheet, TimesheetEntry, WeekRange } from "@/lib/types/timesheet";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

interface EntryRow {
  id: string; starts_at: string; ends_at: string; break_minutes: number; notes: string | null;
  status: ApprovalStatus; projects: RelatedOne<{ name: string }>; tasks: RelatedOne<{ name: string }>;
}
interface TimesheetRow {
  id: string; status: ApprovalStatus; period_start: string; period_end: string;
  users: RelatedOne<{ name: string }>; timesheet_entries: EntryRow[] | null;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1) - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toDateKey(d: Date): string {
  // period_start/period_end are DATE columns (calendar days, no timezone) — use
  // local date components, not toISOString(), which would shift the day
  // backwards for any timezone ahead of UTC (e.g. Belgium/CEST, UTC+2).
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function formatRangeLabel(start: Date, end: Date): string {
  const month = new Intl.DateTimeFormat("en", { month: "short" });
  const startLabel = `${month.format(start)} ${start.getDate()}`;
  const endLabel = `${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`;
  return `${startLabel} – ${endLabel}`;
}
function formatEntryDate(iso: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
}
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}
function workedMinutes(row: EntryRow): number {
  const minutes = Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000);
  return Math.max(0, minutes - row.break_minutes);
}

/** One week, from one person, waiting for a decision. */
export interface PendingTimesheet {
  timesheetId: string;
  employee: string;
  periodStart: string;
  periodEnd: string;
  label: string;
  workedMinutes: number;
  entryCount: number;
  /** True when the reviewer is looking at their own week. */
  isMine: boolean;
}

interface PendingRow {
  id: string; user_id: string; period_start: string; period_end: string;
  users: RelatedOne<{ name: string }>;
  timesheet_entries: { starts_at: string; ends_at: string; break_minutes: number }[] | null;
}

/**
 * Everything submitted and still waiting, oldest week first (#57).
 *
 * Not filtered to the current week the way the workspace is. The queue exists
 * precisely for the weeks that fell behind — showing only this week would hide
 * the backlog that makes the approved total smaller than the hours worked.
 *
 * Company-wide with no role check here: RLS returns only this company's rows,
 * and a worker who opens the page sees the queue but cannot act on it — the
 * database refuses the review, not the screen.
 */
export async function getPendingTimesheets(): Promise<PendingTimesheet[]> {
  const { companyId, session } = await requireActiveCompany();
  const supabase = await createClient();

  const { data } = await supabase
    .from("timesheets")
    .select("id,user_id,period_start,period_end,users!timesheets_user_id_fkey(name),timesheet_entries(starts_at,ends_at,break_minutes)")
    .eq("company_id", companyId)
    .eq("status", "submitted")
    .order("period_start", { ascending: true });

  return ((data ?? []) as PendingRow[]).map((row) => {
    const entries = row.timesheet_entries ?? [];
    return {
      timesheetId: row.id,
      employee: first(row.users)?.name ?? "Unknown",
      periodStart: row.period_start,
      periodEnd: row.period_end,
      label: formatRangeLabel(new Date(`${row.period_start}T00:00:00`), new Date(`${row.period_end}T00:00:00`)),
      workedMinutes: entries.reduce((total, entry) => total + workedMinutes(entry as EntryRow), 0),
      entryCount: entries.length,
      isMine: row.user_id === session.user.id,
    };
  });
}

export async function getTimesheetWorkspace(): Promise<{ timesheet: Timesheet; employees: string[]; projects: string[]; weekRanges: WeekRange[] }> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const currentMonday = mondayOf(new Date());
  const weekRanges: WeekRange[] = [0, 1, 2].map((offset) => {
    const start = new Date(currentMonday);
    start.setDate(start.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { id: toDateKey(start), label: formatRangeLabel(start, end), startDate: toDateKey(start), endDate: toDateKey(end) };
  });
  const currentWeek = weekRanges[0];

  const [{ data: memberRows }, { data: projectRows }, { data: timesheetRows, error }] = await Promise.all([
    supabase.from("company_memberships").select("users!company_memberships_user_id_fkey(name)").eq("company_id", companyId).eq("status", "active"),
    supabase.from("projects").select("name").eq("company_id", companyId).order("name"),
    supabase
      .from("timesheets")
      .select("id,status,period_start,period_end,users!timesheets_user_id_fkey(name),timesheet_entries(id,starts_at,ends_at,break_minutes,notes,status,projects(name),tasks(name))")
      .eq("company_id", companyId)
      .lte("period_start", currentWeek.endDate)
      .gte("period_end", currentWeek.startDate),
  ]);
  if (error) throw new Error("Unable to load timesheets.");

  const employees = [...new Set(((memberRows ?? []) as { users: RelatedOne<{ name: string }> }[]).flatMap((row) => {
    const user = first(row.users);
    return user ? [user.name] : [];
  }))].sort();
  const projects = [...new Set((projectRows ?? []).map((row) => row.name))].sort();

  const rows = (timesheetRows ?? []) as TimesheetRow[];
  const entries: TimesheetEntry[] = rows.flatMap((sheet) => {
    const employeeName = first(sheet.users)?.name ?? "Unknown";
    return (sheet.timesheet_entries ?? []).map((row) => {
      const project = first(row.projects);
      const task = first(row.tasks);
      return {
        id: row.id, timesheetId: sheet.id, employee: employeeName, date: formatEntryDate(row.starts_at),
        project: project?.name ?? "", task: task?.name ?? "",
        startTime: formatTime(row.starts_at), endTime: formatTime(row.ends_at),
        breakMinutes: row.break_minutes, workedMinutes: workedMinutes(row),
        notes: row.notes ?? "", category: "regular", status: row.status,
      };
    });
  });

  const timesheet: Timesheet = {
    id: rows[0]?.id ?? currentWeek.id,
    employee: first(rows[0]?.users ?? null)?.name ?? "All",
    week: currentWeek,
    status: rows[0]?.status ?? "draft",
    entries,
  };

  return { timesheet, employees, projects, weekRanges };
}
