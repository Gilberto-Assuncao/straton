"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";

export type CreateProjectState = { status: "idle" | "error"; message: string };

const managerRoles = ["owner", "admin", "administrator", "manager"];
const validStatuses = ["planning", "active", "paused", "completed", "cancelled"];
const validPriorities = ["low", "medium", "high", "critical"];

export async function createProjectAction(_: CreateProjectState, formData: FormData): Promise<CreateProjectState> {
  const { session, companyId } = await requireActiveCompany();
  const isManager = session.activeCompany!.roles.some((role) => managerRoles.includes(role));
  if (!isManager) return { status: "error", message: "You do not have permission to create projects." };

  const name = String(formData.get("name") ?? "").trim();
  // `clientCompanyId` is what the shared ClientPicker submits; `clientId` is
  // the name the old select used. Both read here so an in-flight form or a
  // bookmarked page does not break on the way through.
  const clientId = String(formData.get("clientCompanyId") ?? formData.get("clientId") ?? "").trim();
  const status = String(formData.get("status") ?? "planning");
  const priority = String(formData.get("priority") ?? "medium");
  const description = String(formData.get("description") ?? "").trim();
  const estimatedHours = String(formData.get("estimated-hours") ?? "");
  const budget = String(formData.get("budget") ?? "");
  const startDate = String(formData.get("start-date") ?? "");
  const endDate = String(formData.get("end-date") ?? "");

  // A client is optional. Internal work — the company's own workshop, its own
  // maintenance — is a project with nobody to invoice, and requiring one would
  // make somebody attach it to a client who is not paying for it.
  if (name.length < 2 || !description || !startDate || !endDate) {
    return { status: "error", message: "Fill in all required fields." };
  }
  if (!validStatuses.includes(status) || !validPriorities.includes(priority)) {
    return { status: "error", message: "Invalid status or priority." };
  }
  if (new Date(endDate) < new Date(startDate)) {
    return { status: "error", message: "End date must be after the start date." };
  }

  // Not re-validated via a `companies` select: a client legitimately isn't
  // always readable by the creating company under RLS (companies_read_member
  // requires membership — see the Projects/Clients gap documented in
  // DATABASE_ARCHITECTURE.md), the same reason getProjects() synthesizes a
  // placeholder client instead of dropping the project. The projects.client_
  // company_id foreign key still rejects a genuinely invalid id.
  if (clientId && !/^[0-9a-f-]{36}$/i.test(clientId)) return { status: "error", message: "Select a valid client." };

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      company_id: companyId, client_company_id: clientId || null, name, description, status, priority,
      starts_at: startDate, ends_at: endDate,
      estimated_hours: estimatedHours ? Number(estimatedHours) : null,
      budget_amount: budget ? Number(budget) : null,
    })
    .select("id")
    .single();
  if (error || !project) return { status: "error", message: error?.message ?? "Unable to create the project." };

  revalidatePath("/dashboard/projects");
  redirect(`/dashboard/projects/${project.id}`);
}
