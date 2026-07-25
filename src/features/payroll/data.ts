import "server-only";

import { getLocale } from "next-intl/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

interface EntryRow { starts_at: string; ends_at: string; break_minutes: number; status: string }
interface TimesheetRow { period_start: string; period_end: string; users: RelatedOne<{ name: string }>; timesheet_entries: EntryRow[] | null }

export interface PayrollEmployeeSummary {
  employee: string;
  regularMinutes: number;
  nightMinutes: number;
  weekendMinutes: number;
  totalMinutes: number;
}

export interface PayrollPeriodSummary {
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  totalMinutes: number;
  nightMinutes: number;
  weekendMinutes: number;
  employees: PayrollEmployeeSummary[];
}

function workedMinutes(row: EntryRow): number {
  const minutes = Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000);
  return Math.max(0, minutes - row.break_minutes);
}
function isNightEntry(row: EntryRow): boolean {
  const startHour = new Date(row.starts_at).getHours();
  const endHour = new Date(row.ends_at).getHours();
  return startHour >= 22 || startHour < 6 || endHour < 6;
}
function isWeekendEntry(row: EntryRow): boolean {
  const day = new Date(row.starts_at).getDay();
  return day === 0 || day === 6;
}

export async function getPayrollPeriodSummary(): Promise<PayrollPeriodSummary> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const periodStartKey = toKey(periodStart);
  const periodEndKey = toKey(periodEnd);
  const locale = await getLocale();
  const periodLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(periodStart);

  const { data: timesheetRows, error } = await supabase
    .from("timesheets")
    .select("period_start,period_end,users!timesheets_user_id_fkey(name),timesheet_entries(starts_at,ends_at,break_minutes,status)")
    .eq("company_id", companyId)
    .eq("status", "approved")
    .lte("period_start", periodEndKey)
    .gte("period_end", periodStartKey);
  if (error) throw new Error("Unable to load payroll data.");

  const rows = (timesheetRows ?? []) as TimesheetRow[];
  const byEmployee = new Map<string, PayrollEmployeeSummary>();

  for (const sheet of rows) {
    const employeeName = first(sheet.users)?.name ?? "Unknown";
    const summary = byEmployee.get(employeeName) ?? { employee: employeeName, regularMinutes: 0, nightMinutes: 0, weekendMinutes: 0, totalMinutes: 0 };
    for (const entry of sheet.timesheet_entries ?? []) {
      if (entry.status !== "approved") continue;
      const minutes = workedMinutes(entry);
      summary.totalMinutes += minutes;
      if (isWeekendEntry(entry)) summary.weekendMinutes += minutes;
      else if (isNightEntry(entry)) summary.nightMinutes += minutes;
      else summary.regularMinutes += minutes;
    }
    byEmployee.set(employeeName, summary);
  }

  const employees = [...byEmployee.values()].sort((a, b) => b.totalMinutes - a.totalMinutes);
  const totalMinutes = employees.reduce((sum, e) => sum + e.totalMinutes, 0);
  const nightMinutes = employees.reduce((sum, e) => sum + e.nightMinutes, 0);
  const weekendMinutes = employees.reduce((sum, e) => sum + e.weekendMinutes, 0);

  return { periodLabel, periodStart: periodStartKey, periodEnd: periodEndKey, totalMinutes, nightMinutes, weekendMinutes, employees };
}
