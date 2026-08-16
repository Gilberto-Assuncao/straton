"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import type { ReportFieldType, ReportSegment } from "@/lib/types/operational-reports";

export type TemplateActionState = {
  status: "idle" | "error";
  message: string;
  /** What was typed, echoed back with the refusal (#74). */
  values?: Record<string, string>;
};

/** Named per action, never derived — see the note on `INVITE_FIELDS`. */
const TEMPLATE_FIELDS = ["name", "segment", "description"] as const;

/**
 * `key` is echoed as typed, not as normalised.
 *
 * The action lowercases it and replaces everything outside `[a-z0-9_]` with an
 * underscore. Sending the normalised form back would silently rewrite what the
 * person wrote while telling them the submission failed — two surprises for
 * the price of one, and the second only visible on a second read.
 */
const FIELD_FIELDS = ["label", "key", "fieldType", "options", "required"] as const;

function submittedField(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const name of FIELD_FIELDS) values[name] = String(formData.get(name) ?? "");
  return values;
}

function submittedTemplate(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of TEMPLATE_FIELDS) values[key] = String(formData.get(key) ?? "");
  return values;
}

const managerRoles = ["owner", "admin", "administrator", "manager"];

const SEGMENTS: ReportSegment[] = ["construction", "cleaning", "maintenance", "security", "landscaping", "technical_assistance", "facilities", "general_services", "custom"];
const FIELD_TYPES: ReportFieldType[] = ["text", "number", "date", "select", "multiselect", "checklist", "photo", "signature", "boolean"];
const CHOICE_TYPES: ReportFieldType[] = ["select", "multiselect", "checklist"];

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function guard() {
  const { session, companyId } = await requireActiveCompany();
  return { allowed: session.activeCompany!.roles.some((role) => managerRoles.includes(role)), companyId };
}

// ---------------------------------------------------------------- templates

export async function saveTemplateAction(_: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  const values = submittedTemplate(formData);
  const { allowed, companyId } = await guard();
  if (!allowed) return { status: "error", message: "You do not have permission to manage report templates.", values };

  const templateId = text(formData, "templateId");
  const name = text(formData, "name");
  const segment = text(formData, "segment") as ReportSegment;
  const description = text(formData, "description");

  if (name.length < 2) return { status: "error", message: "Enter a template name.", values };
  if (!SEGMENTS.includes(segment)) return { status: "error", message: "Select a valid segment.", values };

  const supabase = await createClient();
  const payload = { name, segment, description: description || null };

  if (templateId) {
    const { error } = await supabase.from("report_templates").update(payload).eq("id", templateId).eq("company_id", companyId);
    if (error) return { status: "error", message: error.message, values };
    revalidatePath("/dashboard/field-reports/templates");
    redirect(`/dashboard/field-reports/templates/${templateId}`);
  }

  const { data, error } = await supabase
    .from("report_templates")
    .insert({ ...payload, company_id: companyId, active: true })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: error?.message ?? "Unable to create the template.", values };

  revalidatePath("/dashboard/field-reports/templates");
  redirect(`/dashboard/field-reports/templates/${data.id}`);
}

// Templates are deactivated rather than deleted once reports reference them:
// removing the row would leave submitted reports pointing at nothing, and the
// field definitions are what make their stored values readable.
export async function setTemplateActiveAction(templateId: string, active: boolean): Promise<{ ok: boolean; message: string }> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to manage report templates." };

  const supabase = await createClient();
  const { error } = await supabase.from("report_templates").update({ active }).eq("id", templateId).eq("company_id", companyId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/field-reports/templates");
  return { ok: true, message: active ? "Template reactivated." : "Template deactivated; existing reports keep working." };
}

// ------------------------------------------------------------------- fields

function parseOptions(raw: string, fieldType: ReportFieldType) {
  if (!CHOICE_TYPES.includes(fieldType)) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // "value|Label" lets the stored value stay stable while the label is
      // reworded; a bare line uses the same string for both.
      const [value, label] = line.split("|").map((part) => part.trim());
      return { value, label: label || value };
    });
}

export async function saveFieldAction(_: TemplateActionState, formData: FormData): Promise<TemplateActionState> {
  const values = submittedField(formData);
  const { allowed, companyId } = await guard();
  if (!allowed) return { status: "error", message: "You do not have permission to manage report templates.", values };

  const templateId = text(formData, "templateId");
  const fieldId = text(formData, "fieldId");
  const key = text(formData, "key").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const label = text(formData, "label");
  const fieldType = text(formData, "fieldType") as ReportFieldType;
  const required = formData.get("required") === "on";
  const optionsRaw = text(formData, "options");

  if (!templateId) return { status: "error", message: "Template not found.", values };
  if (!key) return { status: "error", message: "Enter a field key.", values };
  if (label.length < 1) return { status: "error", message: "Enter a field label.", values };
  if (!FIELD_TYPES.includes(fieldType)) return { status: "error", message: "Select a valid field type.", values };

  const options = parseOptions(optionsRaw, fieldType);
  if (CHOICE_TYPES.includes(fieldType) && options.length === 0) {
    return { status: "error", message: "A choice field needs at least one option.", values };
  }

  const supabase = await createClient();

  // The key identifies the field in stored values, so it must stay unique
  // within the template — reusing one would make two fields read the same
  // answer.
  const { data: clash } = await supabase
    .from("report_template_fields")
    .select("id")
    .eq("template_id", templateId)
    .eq("company_id", companyId)
    .eq("key", key)
    .maybeSingle();
  if (clash && clash.id !== fieldId) return { status: "error", message: "Another field already uses that key.", values };

  if (fieldId) {
    const { error } = await supabase
      .from("report_template_fields")
      .update({ key, label, field_type: fieldType, required, options })
      .eq("id", fieldId)
      .eq("company_id", companyId);
    if (error) return { status: "error", message: error.message, values };
  } else {
    const { data: last } = await supabase
      .from("report_template_fields")
      .select("display_order")
      .eq("template_id", templateId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("report_template_fields").insert({
      template_id: templateId, company_id: companyId, key, label,
      field_type: fieldType, required, options,
      display_order: (last?.display_order ?? 0) + 1, active: true,
    });
    if (error) return { status: "error", message: error.message, values };
  }

  revalidatePath(`/dashboard/field-reports/templates/${templateId}`);
  redirect(`/dashboard/field-reports/templates/${templateId}`);
}

export async function removeFieldAction(templateId: string, fieldId: string): Promise<{ ok: boolean; message: string }> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to manage report templates." };

  const supabase = await createClient();

  // A field that has already collected answers is deactivated, not deleted:
  // operational_report_values points at it, and dropping it would orphan the
  // answers submitted through it.
  const { count } = await supabase
    .from("operational_report_values")
    .select("id", { count: "exact", head: true })
    .eq("field_id", fieldId)
    .eq("company_id", companyId);

  const query = (count ?? 0) > 0
    ? supabase.from("report_template_fields").update({ active: false }).eq("id", fieldId).eq("company_id", companyId)
    : supabase.from("report_template_fields").delete().eq("id", fieldId).eq("company_id", companyId);

  const { error } = await query;
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/dashboard/field-reports/templates/${templateId}`);
  return { ok: true, message: (count ?? 0) > 0 ? "Field retired; submitted answers were kept." : "Field removed." };
}

export async function moveFieldAction(templateId: string, fieldId: string, direction: "up" | "down"): Promise<{ ok: boolean; message: string }> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to manage report templates." };

  const supabase = await createClient();
  const { data: fields } = await supabase
    .from("report_template_fields")
    .select("id,display_order")
    .eq("template_id", templateId)
    .eq("company_id", companyId)
    .eq("active", true)
    .order("display_order");

  const list = (fields ?? []) as { id: string; display_order: number }[];
  const index = list.findIndex((field) => field.id === fieldId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= list.length) return { ok: false, message: "Cannot move further." };

  const a = list[index];
  const b = list[swapWith];
  await supabase.from("report_template_fields").update({ display_order: b.display_order }).eq("id", a.id);
  await supabase.from("report_template_fields").update({ display_order: a.display_order }).eq("id", b.id);

  revalidatePath(`/dashboard/field-reports/templates/${templateId}`);
  return { ok: true, message: "Order updated." };
}
