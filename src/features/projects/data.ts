import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type { Client, Project, ProjectMember, ProjectPriority, ProjectStatus } from "@/lib/types/project";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length ? parts.slice(0, 2).map((part) => part[0]).join("") : name.slice(0, 2)).toUpperCase();
}

interface CompanyRow {
  id: string; name: string; contact_name: string | null; email: string | null; phone: string | null;
  country: string | null; country_code: string | null; vat_number: string | null;
  address_line_1: string | null; postal_code: string | null; city: string | null;
}
interface ProjectMembershipRow {
  left_at: string | null;
  company_memberships: RelatedOne<{ id: string; users: RelatedOne<{ name: string }>; membership_roles: { roles: RelatedOne<{ key: string }> }[] | null }>;
}
interface ProjectRow {
  id: string; name: string; description: string | null; status: ProjectStatus; priority: ProjectPriority;
  client_company_id: string | null; starts_at: string | null; ends_at: string | null;
  estimated_hours: number | null; budget_amount: number | null; budget_spent: number; budget_currency: string;
  project_memberships: ProjectMembershipRow[] | null;
}
interface EntryRow { project_id: string; starts_at: string; ends_at: string; break_minutes: number; status: string }

function toClient(row: CompanyRow): Client {
  return {
    id: row.id, companyName: row.name, contactName: row.contact_name ?? "",
    email: row.email ?? "", phone: row.phone ?? "", country: row.country ?? row.country_code ?? "",
    vat: row.vat_number ?? "", address: [row.address_line_1, row.postal_code, row.city].filter(Boolean).join(", "),
  };
}

async function loadProjects(): Promise<{ projects: Project[]; clients: Client[] }> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: projectRows, error }, { data: entryRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,description,status,priority,client_company_id,starts_at,ends_at,estimated_hours,budget_amount,budget_spent,budget_currency,project_memberships(left_at,company_memberships(id,users!company_memberships_user_id_fkey(name),membership_roles(roles(key))))")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("timesheet_entries").select("project_id,starts_at,ends_at,break_minutes,status").eq("company_id", companyId).not("project_id", "is", null),
  ]);
  if (error) throw new Error("Unable to load projects.");

  const rows = (projectRows ?? []) as ProjectRow[];
  const clientIds = [...new Set(rows.flatMap((row) => (row.client_company_id ? [row.client_company_id] : [])))];
  const { data: clientRows } = clientIds.length
    ? await supabase.from("companies").select("id,name,contact_name,email,phone,country,country_code,vat_number,address_line_1,postal_code,city").in("id", clientIds)
    : { data: [] as CompanyRow[] };
  const clientById = new Map(((clientRows ?? []) as CompanyRow[]).map((row) => [row.id, toClient(row)]));
  // A project's client company may not be readable under RLS (companies_read_member
  // requires membership; a client is often a company we only have a business
  // relationship with, not membership in). Synthesize a placeholder rather than
  // silently dropping the project — see DATABASE_ARCHITECTURE.md for the
  // registered follow-up on this RLS gap.
  for (const clientId of clientIds) {
    if (!clientById.has(clientId)) {
      clientById.set(clientId, { id: clientId, companyName: "Client information unavailable", contactName: "", email: "", phone: "", country: "", vat: "", address: "" });
    }
  }

  const hoursByProject = new Map<string, { tracked: number; billable: number; entries: number }>();
  for (const row of (entryRows ?? []) as EntryRow[]) {
    const minutes = Math.max(0, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000) - row.break_minutes);
    const current = hoursByProject.get(row.project_id) ?? { tracked: 0, billable: 0, entries: 0 };
    current.tracked += minutes;
    if (row.status === "approved") current.billable += minutes;
    current.entries += 1;
    hoursByProject.set(row.project_id, current);
  }

  const projects: Project[] = rows.flatMap((row) => {
    // A project with no client is internal work, not a broken row. Dropping it
    // here would make it vanish from the list with nothing to explain why —
    // the same silent subtraction as the hours that had no site.
    if (row.client_company_id && !clientById.has(row.client_company_id)) return [];
    const hours = hoursByProject.get(row.id) ?? { tracked: 0, billable: 0, entries: 0 };
    const activeMemberships = (row.project_memberships ?? []).filter((link) => link.left_at === null);
    const members: ProjectMember[] = activeMemberships.flatMap((link) => {
      const membership = first(link.company_memberships);
      const user = membership ? first(membership.users) : null;
      if (!membership || !user) return [];
      const roleEntry = membership.membership_roles?.[0] ?? null;
      const role = roleEntry ? first(roleEntry.roles) : null;
      return [{ id: membership.id, name: user.name, role: role?.key ?? "member", initials: initials(user.name) }];
    });
    const trackedHours = Math.round((hours.tracked / 60) * 100) / 100;
    return [{
      id: row.id, name: row.name, clientId: row.client_company_id ?? null, status: row.status, priority: row.priority,
      estimatedHours: row.estimated_hours ?? 0, workedHours: trackedHours,
      startDate: row.starts_at ?? "", endDate: row.ends_at ?? "",
      budget: { amount: row.budget_amount ?? 0, currency: (row.budget_currency as "EUR") ?? "EUR", spent: row.budget_spent },
      description: row.description ?? "", members,
      statistics: { trackedHours, billableHours: Math.round((hours.billable / 60) * 100) / 100, entries: hours.entries, members: members.length },
    }];
  });

  return { projects, clients: [...clientById.values()] };
}

export async function getProjects(): Promise<{ projects: Project[]; clients: Client[] }> {
  return loadProjects();
}

export async function getProjectById(projectId: string): Promise<{ project: Project; client: Client } | null> {
  const { projects, clients } = await loadProjects();
  const project = projects.find((item) => item.id === projectId);
  if (!project) return null;
  const client = clients.find((item) => item.id === project.clientId);
  if (!client) return null;
  return { project, client };
}
