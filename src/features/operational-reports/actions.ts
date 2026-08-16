"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { reviewerRoles } from "@/src/features/operational-reports/data";
import type { FieldValue, ReportFieldType } from "@/lib/types/operational-reports";
import type { ReportMessageKey } from "./messages";
import { log } from "@/src/infrastructure/observability/logger";

export type ReportActionResult = { ok: boolean; messageKey: ReportMessageKey; reportId?: string };

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
  if (error || !report) {
    log.error({ event: "report_insert_failed", source: "createOperationalReportAction", companyId, code: error?.code }, error);
    return { ok: false, messageKey: "errReportSaveFailed" };
  }

  const valuesError = await replaceValues(report.id, companyId, input.values);
  if (valuesError) {
    log.error({ event: "report_values_insert_failed", source: "createOperationalReportAction", companyId, code: valuesError.code }, valuesError);
    return { ok: false, messageKey: "errReportSaveFailed" };
  }

  await logHistory(report.id, companyId, session.user.id, "created");
  revalidatePath("/dashboard/field-reports");
  return { ok: true, messageKey: "okDraftSaved", reportId: report.id };
}

export async function updateOperationalReportAction(reportId: string, input: OperationalReportInput): Promise<ReportActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("operational_reports").select("worker_id,status").eq("id", reportId).eq("company_id", companyId).maybeSingle();
  if (!existing) return { ok: false, messageKey: "errReportNotFound" };
  if (existing.worker_id !== session.user.id) return { ok: false, messageKey: "errOnlyAuthorEdits" };
  if (!editableStatuses.includes(existing.status)) return { ok: false, messageKey: "errNoLongerEditable" };

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
  if (error) {
    log.error({ event: "report_update_failed", source: "updateOperationalReportAction", companyId, code: error.code }, error);
    return { ok: false, messageKey: "errReportSaveFailed" };
  }

  const valuesError = await replaceValues(reportId, companyId, input.values);
  if (valuesError) {
    log.error({ event: "report_values_update_failed", source: "updateOperationalReportAction", companyId, code: valuesError.code }, valuesError);
    return { ok: false, messageKey: "errReportSaveFailed" };
  }

  await logHistory(reportId, companyId, session.user.id, "edited");
  revalidatePath(`/dashboard/field-reports/${reportId}`);
  return { ok: true, messageKey: "okReportUpdated", reportId };
}

export async function submitOperationalReportAction(reportId: string): Promise<ReportActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("operational_reports").select("worker_id,status").eq("id", reportId).eq("company_id", companyId).maybeSingle();
  if (!existing) return { ok: false, messageKey: "errReportNotFound" };
  if (existing.worker_id !== session.user.id) return { ok: false, messageKey: "errOnlyAuthorSubmits" };
  if (!editableStatuses.includes(existing.status)) return { ok: false, messageKey: "errAlreadySubmitted" };

  const { error } = await supabase.from("operational_reports").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", reportId);
  if (error) {
    log.error({ event: "report_submit_failed", source: "submitOperationalReportAction", companyId, code: error.code }, error);
    return { ok: false, messageKey: "errReportSaveFailed" };
  }

  await logHistory(reportId, companyId, session.user.id, "submitted");
  revalidatePath(`/dashboard/field-reports/${reportId}`);
  revalidatePath("/dashboard/field-reports");
  return { ok: true, messageKey: "okReportSubmitted", reportId };
}

async function review(reportId: string, decision: "approved" | "rejected" | "changes_requested", reason?: string): Promise<ReportActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const isReviewer = session.activeCompany!.roles.some((role) => reviewerRoles.includes(role));
  if (!isReviewer) return { ok: false, messageKey: "errNoPermissionReview" };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("operational_reports").select("status").eq("id", reportId).eq("company_id", companyId).maybeSingle();
  if (!existing) return { ok: false, messageKey: "errReportNotFound" };
  if (existing.status !== "submitted" && existing.status !== "under_review") return { ok: false, messageKey: "errOnlySubmittedReviewed" };

  const { error } = await supabase
    .from("operational_reports")
    .update({ status: decision, reviewed_by: session.user.id, reviewed_at: new Date().toISOString(), rejection_reason: decision === "approved" ? null : (reason ?? null) })
    .eq("id", reportId);
  if (error) {
    log.error({ event: "report_review_failed", source: "review", companyId, code: error.code }, error);
    return { ok: false, messageKey: "errReviewSaveFailed" };
  }

  await logHistory(reportId, companyId, session.user.id, decision, reason);
  revalidatePath(`/dashboard/field-reports/${reportId}`);
  revalidatePath("/dashboard/field-reports");
  const decided: Record<typeof decision, ReportMessageKey> = {
    approved: "okReportApproved", rejected: "okReportRejected", changes_requested: "okChangesRequested",
  };
  return { ok: true, messageKey: decided[decision], reportId };
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
