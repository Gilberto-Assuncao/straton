import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import { getTeamWorkspace } from "@/src/features/teams";
import type { Employee, EmployeeStatus, EmploymentType } from "@/lib/types/employee";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

interface UserRow { id: string; first_name: string | null; last_name: string | null; email: string; phone: string | null }
interface TeamMembershipRow { team_id: string; left_at: string | null }
interface MembershipRow {
  id: string; status: string; user_id: string;
  users: RelatedOne<UserRow>;
  team_memberships: TeamMembershipRow[] | null;
}
interface EmployeeRecordRow {
  id: string; job_title: string; employment_type: string; start_date: string | null; created_at: string;
  company_memberships: RelatedOne<MembershipRow>;
}

function initials(firstName: string, lastName: string): string {
  const value = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
  return (value || firstName.slice(0, 2)).toUpperCase();
}
function toStatus(membershipStatus: string): EmployeeStatus {
  if (membershipStatus === "invited") return "invited";
  if (membershipStatus === "active") return "active";
  return "inactive";
}
function toEmploymentType(dbType: string): EmploymentType {
  if (dbType === "contractor" || dbType === "temporary") return dbType;
  return "employee";
}
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

async function loadEmployees(): Promise<{ employees: Employee[]; teamNames: string[] }> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const weekStart = mondayOf(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const workspace = await getTeamWorkspace();
  const teamNameById = new Map(workspace.teams.map((team) => [team.id, team.name]));

  const [{ data: recordRows, error }, { data: hourRows }] = await Promise.all([
    supabase
      .from("employee_records")
      .select("id,job_title,employment_type,start_date,created_at,company_memberships!employee_records_company_membership_id_fkey(id,status,user_id,users!company_memberships_user_id_fkey(id,first_name,last_name,email,phone),team_memberships(team_id,left_at))")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("timesheet_entries")
      .select("starts_at,ends_at,break_minutes,timesheets!inner(user_id)")
      .eq("company_id", companyId)
      .gte("starts_at", toDateKey(weekStart))
      .lte("starts_at", toDateKey(weekEnd)),
  ]);
  if (error) throw new Error("Unable to load employees.");

  const hoursByUser = new Map<string, number>();
  for (const row of (hourRows ?? []) as { starts_at: string; ends_at: string; break_minutes: number; timesheets: RelatedOne<{ user_id: string }> }[]) {
    const timesheet = first(row.timesheets);
    if (!timesheet) continue;
    const minutes = Math.max(0, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000) - row.break_minutes);
    hoursByUser.set(timesheet.user_id, (hoursByUser.get(timesheet.user_id) ?? 0) + minutes);
  }

  const employees: Employee[] = ((recordRows ?? []) as EmployeeRecordRow[]).flatMap((row) => {
    const membership = first(row.company_memberships);
    const user = membership ? first(membership.users) : null;
    if (!membership || !user) return [];
    const firstName = user.first_name ?? user.email.split("@")[0];
    const lastName = user.last_name ?? "";
    const activeTeamLink = (membership.team_memberships ?? []).find((link) => link.left_at === null) ?? null;
    const workedMinutes = hoursByUser.get(membership.user_id) ?? 0;
    return [{
      id: row.id, firstName, lastName, email: user.email, phone: user.phone ?? undefined,
      jobTitle: row.job_title, team: activeTeamLink ? (teamNameById.get(activeTeamLink.team_id) ?? null) : null,
      status: toStatus(membership.status), employmentType: toEmploymentType(row.employment_type),
      hourlyRate: undefined, startDate: row.start_date ?? "", avatarInitials: initials(firstName, lastName),
      totalHoursThisWeek: Math.round((workedMinutes / 60) * 100) / 100, createdAt: row.created_at,
    }];
  });

  // Real teams only. "Unassigned" used to land in here and show up in the
  // filter as a team somebody could belong to.
  const teamNames = [...new Set(employees.flatMap((employee) => (employee.team ? [employee.team] : [])))].sort();
  return { employees, teamNames };
}

export async function getEmployees(): Promise<{ employees: Employee[]; teamNames: string[] }> {
  return loadEmployees();
}

export async function getEmployeeById(employeeId: string): Promise<Employee | null> {
  const { employees } = await loadEmployees();
  return employees.find((employee) => employee.id === employeeId) ?? null;
}
