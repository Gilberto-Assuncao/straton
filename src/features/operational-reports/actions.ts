"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { reviewerRoles } from "@/src/features/operational-reports/data";
import type { FieldValue, ReportFieldType } from "@/lib/types/operational-reports";

export type ReportActionResult = { ok: boolean; message: string; reportId?: string };

export type FieldValueInput = { fieldId: string; fieldType: ReportFieldType; value: FieldValue };

export type OperationalReportInput = {
  templateId: string | null;
  reportDate: string;
  startsAt: string | null;
  endsAt: string | null;
  breakMinutes: number;
  siteId: string | null;
  activity: string;
  notes: string;
  values: FieldValueInput[];
};

const editableStatuses = ["draft", "changes_requested"];

function valueColumns(fieldType: ReportFieldType, value: FieldValue) {
  if (fieldType === "number") return { value_number: typeof value === "number" ? value : null };
  if (fieldType === "boolean") return { value_boolean: typeof value === "boolean" ? value : null };
  if (fieldType === "multiselect" || fieldType === "checklist") return { value_json: Array.isArray(value) ? value : null };
  return { value_text: typeof value === "string" ? value : null };
}

async function replaceValues(reportId: string, companyId: string, values: FieldValueInput[]) {
  const supabase = await createClient();
  await supabase.from("operational_report_values").delete().eq("report_id", reportId);
  if (!values.length) return null;
  const rows = values.map(({ fieldId, fieldType, value }) => ({ report_id: reportId, field_id: fieldId, company_id: companyId, ...valueColumns(fieldType, value) }));
  const { error } = await supabase.from("operational_report_values").insert(rows);
  return error;
}

async function logHistory(reportId: string, companyId: string, actorId: string, action: string, note?: string) {
  const supabase = await createClient();
  await supabase.from("operational_report_history").insert({ report_id: reportId, company_id: companyId, actor_id: actorId, action, note: note ?? null });
}

export async function createOperationalReportAction(input: OperationalReportInput): Promise<ReportActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from("operational_reports")
    .insert({
      company_id: companyId,
      template_id: input.templateId,
      worker_id: session.user.id,
      created_by: session.user.id,
      site_id: input.siteId,
      report_date: input.reportDate,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      break_minutes: input.breakMinutes,
      activity: input.activity || null,
      notes: input.notes || null,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !report) return { ok: false, message: error?.message ?? "Unable to create the report." };

  const valuesError = await replaceValues(report.id, companyId, input.values);
  if (valuesError) return { ok: false, message: valuesError.message };

  await logHistory(report.id, companyId, session.user.id, "created");
  revalidatePath("/dashboard/field-reports");
  return { ok: true, message: "Report saved as draft.", reportId: report.id };
}

export async function updateOperationalReportAction(reportId: string, input: OperationalReportInput): Promise<ReportActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("operational_reports").select("worker_id,status").eq("id", reportId).eq("company_id", companyId).maybeSingle();
  if (!existing) return { ok: false, message: "Report not found." };
  if (existing.worker_id !== session.user.id) return { ok: false, message: "Only the worker who created this report can edit it." };
  if (!editableStatuses.includes(existing.status)) return { ok: false, message: "This report can no longer be edited." };

  const { error } = await supabase
    .from("operational_reports")
    .update({
      template_id: input.templateId,
      site_id: input.siteId,
      report_date: input.reportDate,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      break_minutes: input.breakMinutes,
      activity: input.activity || null,
      notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return { ok: false, message: error.message };

  const valuesError = await replaceValues(reportId, companyId, input.values);
  if (valuesError) return { ok: false, message: valuesError.message };

  await logHistory(reportId, companyId, session.user.id, "edited");
  revalidatePath(`/dashboard/field-reports/${reportId}`);
  return { ok: true, message: "Report updated.", reportId };
}

export async function submitOperationalReportAction(reportId: string): Promise<ReportActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("operational_reports").select("worker_id,status").eq("id", reportId).eq("company_id", companyId).maybeSingle();
  if (!existing) return { ok: false, message: "Report not found." };
  if (existing.worker_id !== session.user.id) return { ok: false, message: "Only the worker who created this report can submit it." };
  if (!editableStatuses.includes(existing.status)) return { ok: false, message: "This report was already submitted." };

  const { error } = await supabase.from("operational_reports").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", reportId);
  if (error) return { ok: false, message: error.message };

  await logHistory(reportId, companyId, session.user.id, "submitted");
  revalidatePath(`/dashboard/field-reports/${reportId}`);
  revalidatePath("/dashboard/field-reports");
  return { ok: true, message: "Report submitted for approval.", reportId };
}

async function review(reportId: string, decision: "approved" | "rejected" | "changes_requested", reason?: string): Promise<ReportActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const isReviewer = session.activeCompany!.roles.some((role) => reviewerRoles.includes(role));
  if (!isReviewer) return { ok: false, message: "You do not have permission to review reports." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("operational_reports").select("status").eq("id", reportId).eq("company_id", companyId).maybeSingle();
  if (!existing) return { ok: false, message: "Report not found." };
  if (existing.status !== "submitted" && existing.status !== "under_review") return { ok: false, message: "Only submitted reports can be reviewed." };

  const { error } = await supabase
    .from("operational_reports")
    .update({ status: decision, reviewed_by: session.user.id, reviewed_at: new Date().toISOString(), rejection_reason: decision === "approved" ? null : (reason ?? null) })
    .eq("id", reportId);
  if (error) return { ok: false, message: error.message };

  await logHistory(reportId, companyId, session.user.id, decision, reason);
  revalidatePath(`/dashboard/field-reports/${reportId}`);
  revalidatePath("/dashboard/field-reports");
  const messages = { approved: "Report approved.", rejected: "Report rejected.", changes_requested: "Changes requested." };
  return { ok: true, message: messages[decision], reportId };
}

export async function approveOperationalReportAction(reportId: string) {
  return review(reportId, "approved");
}
export async function rejectOperationalReportAction(reportId: string, reason: string) {
  return review(reportId, "rejected", reason);
}
export async function requestChangesOperationalReportAction(reportId: string, reason: string) {
  return review(reportId, "changes_requested", reason);
}
