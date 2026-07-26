import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type {
  FieldValue,
  OperationalReportDetail,
  OperationalReportHistoryEntry,
  OperationalReportListItem,
  OperationalReportStatus,
  ReportTemplate,
  ReportTemplateField,
} from "@/lib/types/operational-reports";

export const reviewerRoles = ["owner", "admin", "administrator", "manager", "supervisor"];

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface TemplateFieldRow {
  id: string;
  key: string;
  label: string;
  field_type: ReportTemplateField["fieldType"];
  required: boolean;
  options: unknown;
  display_order: number;
}
interface TemplateRow {
  id: string;
  segment: ReportTemplate["segment"];
  name: string;
  description: string | null;
  report_template_fields: TemplateFieldRow[] | null;
}

// Options are stored as {value,label} objects, but a plain list of strings is
// accepted too: it is the shape a human reaches for when writing SQL by hand,
// and silently dropping every choice is a worse failure than normalising it.
function mapField(row: TemplateFieldRow): ReportTemplateField {
  const raw = Array.isArray(row.options) ? row.options : [];
  const options = raw.map((option) =>
    typeof option === "string"
      ? { value: option, label: option }
      : (option as { value: string; label: string }),
  ).filter((option) => option && typeof option.value === "string");
  return { id: row.id, key: row.key, label: row.label, fieldType: row.field_type, required: row.required, options, displayOrder: row.display_order };
}

export async function getReportTemplates(): Promise<ReportTemplate[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_templates")
    .select("id,segment,name,description,report_template_fields(id,key,label,field_type,required,options,display_order)")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("name");
  if (error) throw new Error("Unable to load report templates.");

  return ((data ?? []) as TemplateRow[]).map((row) => ({
    id: row.id,
    segment: row.segment,
    name: row.name,
    description: row.description,
    fields: (row.report_template_fields ?? []).filter((field) => field).sort((a, b) => a.display_order - b.display_order).map(mapField),
  }));
}

interface ListRow {
  id: string;
  report_date: string;
  status: OperationalReportStatus;
  worker_id: string;
  users: RelatedOne<{ name: string }>;
  report_templates: RelatedOne<{ name: string }>;
  projects: RelatedOne<{ name: string }>;
  sites: RelatedOne<{ name: string }>;
}

export async function getOperationalReports(): Promise<{ reports: OperationalReportListItem[]; canReviewAll: boolean }> {
  const { session, companyId } = await requireActiveCompany();
  const canReviewAll = session.activeCompany!.roles.some((role) => reviewerRoles.includes(role));
  const supabase = await createClient();

  let query = supabase
    .from("operational_reports")
    .select("id,report_date,status,worker_id,users!operational_reports_worker_id_fkey(name),report_templates(name),projects(name),sites(name)")
    .eq("company_id", companyId)
    .order("report_date", { ascending: false });
  if (!canReviewAll) query = query.eq("worker_id", session.user.id);

  const { data, error } = await query;
  if (error) throw new Error("Unable to load operational reports.");

  const reports: OperationalReportListItem[] = ((data ?? []) as ListRow[]).map((row) => ({
    id: row.id,
    reportDate: row.report_date,
    workerName: first(row.users)?.name ?? "—",
    templateName: first(row.report_templates)?.name ?? null,
    projectName: first(row.projects)?.name ?? null,
    siteName: first(row.sites)?.name ?? null,
    status: row.status,
  }));

  return { reports, canReviewAll };
}

interface DetailRow {
  id: string;
  company_id: string;
  worker_id: string;
  template_id: string | null;
  team_id: string | null;
  project_id: string | null;
  site_id: string | null;
  report_date: string;
  starts_at: string | null;
  ends_at: string | null;
  break_minutes: number;
  activity: string | null;
  notes: string | null;
  status: OperationalReportStatus;
  rejection_reason: string | null;
  users: RelatedOne<{ name: string }>;
  projects: RelatedOne<{ name: string }>;
  sites: RelatedOne<{ name: string }>;
}
interface ValueRow {
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_json: unknown;
  report_template_fields: RelatedOne<{ key: string; field_type: ReportTemplateField["fieldType"] }>;
}
interface HistoryRow {
  id: string;
  action: string;
  note: string | null;
  occurred_at: string;
  users: RelatedOne<{ name: string }>;
}

function extractValue(row: ValueRow): FieldValue {
  const field = first(row.report_template_fields);
  if (!field) return null;
  if (field.field_type === "multiselect" || field.field_type === "checklist") return Array.isArray(row.value_json) ? (row.value_json as string[]) : null;
  if (field.field_type === "number") return row.value_number;
  if (field.field_type === "boolean") return row.value_boolean;
  return row.value_text;
}

export async function getOperationalReportDetail(reportId: string): Promise<OperationalReportDetail | null> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: report, error }, { data: values }, { data: history }] = await Promise.all([
    supabase
      .from("operational_reports")
      .select(
        "id,company_id,worker_id,template_id,team_id,project_id,site_id,report_date,starts_at,ends_at,break_minutes,activity,notes,status,rejection_reason,users!operational_reports_worker_id_fkey(name),projects(name),sites(name)"
      )
      .eq("id", reportId)
      .eq("company_id", companyId)
      .maybeSingle(),
    supabase.from("operational_report_values").select("value_text,value_number,value_boolean,value_json,report_template_fields(key,field_type)").eq("report_id", reportId),
    supabase.from("operational_report_history").select("id,action,note,occurred_at,users(name)").eq("report_id", reportId).order("occurred_at", { ascending: true }),
  ]);
  if (error || !report) return null;

  const row = report as DetailRow;
  let templateName: string | null = null;
  let templateFields: ReportTemplateField[] = [];
  if (row.template_id) {
    const { data: template } = await supabase
      .from("report_templates")
      .select("name,report_template_fields(id,key,label,field_type,required,options,display_order)")
      .eq("id", row.template_id)
      .maybeSingle();
    if (template) {
      templateName = template.name;
      templateFields = ((template.report_template_fields ?? []) as TemplateFieldRow[]).sort((a, b) => a.display_order - b.display_order).map(mapField);
    }
  }

  const values_: Record<string, FieldValue> = {};
  for (const valueRow of (values ?? []) as ValueRow[]) {
    const field = first(valueRow.report_template_fields);
    if (field) values_[field.key] = extractValue(valueRow);
  }

  const historyEntries: OperationalReportHistoryEntry[] = ((history ?? []) as HistoryRow[]).map((entry) => ({
    id: entry.id,
    action: entry.action,
    actorName: first(entry.users)?.name ?? null,
    note: entry.note,
    occurredAt: entry.occurred_at,
  }));

  return {
    id: row.id,
    companyId: row.company_id,
    workerId: row.worker_id,
    workerName: first(row.users)?.name ?? "—",
    templateId: row.template_id,
    templateName,
    templateFields,
    teamId: row.team_id,
    projectId: row.project_id,
    projectName: first(row.projects)?.name ?? null,
    siteId: row.site_id,
    siteName: first(row.sites)?.name ?? null,
    reportDate: row.report_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    breakMinutes: row.break_minutes,
    activity: row.activity,
    notes: row.notes,
    status: row.status,
    rejectionReason: row.rejection_reason,
    values: values_,
    history: historyEntries,
  };
}

export async function getProjectAndSiteOptions(): Promise<{ projects: { id: string; name: string }[]; sites: { id: string; name: string }[] }> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const [{ data: projects }, { data: sites }] = await Promise.all([
    supabase.from("projects").select("id,name").eq("company_id", companyId).order("name"),
    supabase.from("sites").select("id,name").eq("company_id", companyId).order("name"),
  ]);
  return { projects: projects ?? [], sites: sites ?? [] };
}

// The management view differs from getReportTemplates in two ways: it includes
// inactive templates, and it reports how many reports already use each one —
// which is what makes deletion unsafe and archiving the right default.
export type ManagedTemplate = ReportTemplate & { active: boolean; reportCount: number };

export async function getManagedTemplates(): Promise<ManagedTemplate[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data, error }, { data: usage }] = await Promise.all([
    supabase
      .from("report_templates")
      .select("id,segment,name,description,active,report_template_fields(id,key,label,field_type,required,options,display_order,active)")
      .eq("company_id", companyId)
      .order("name"),
    supabase.from("operational_reports").select("template_id").eq("company_id", companyId),
  ]);
  if (error) throw new Error("Unable to load report templates.");

  const counts = new Map<string, number>();
  for (const row of (usage ?? []) as { template_id: string | null }[]) {
    if (row.template_id) counts.set(row.template_id, (counts.get(row.template_id) ?? 0) + 1);
  }

  return ((data ?? []) as (TemplateRow & { active: boolean })[]).map((row) => ({
    id: row.id,
    segment: row.segment,
    name: row.name,
    description: row.description,
    active: row.active,
    reportCount: counts.get(row.id) ?? 0,
    fields: (row.report_template_fields ?? [])
      .filter((field) => field && (field as TemplateFieldRow & { active?: boolean }).active !== false)
      .sort((a, b) => a.display_order - b.display_order)
      .map(mapField),
  }));
}

export async function getManagedTemplateById(templateId: string): Promise<ManagedTemplate | null> {
  const templates = await getManagedTemplates();
  return templates.find((template) => template.id === templateId) ?? null;
}
