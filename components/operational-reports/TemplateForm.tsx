"use client";

import { useActionState } from "react";
import { useSubmittedValues } from "@/components/auth/useSubmittedValues";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { saveTemplateAction, type TemplateActionState } from "@/src/features/operational-reports/template-actions";
import type { ReportSegment } from "@/lib/types/operational-reports";

const SEGMENTS: ReportSegment[] = ["construction", "cleaning", "maintenance", "security", "landscaping", "technical_assistance", "facilities", "general_services", "custom"];

const field = "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-base text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 user-invalid:border-red-400";
const labelClass = "text-sm font-medium text-[#E5E7EB]";

export default function TemplateForm({ template }: { template?: { id: string; name: string; segment: ReportSegment; description: string | null } }) {
  const t = useTranslations("reportTemplates");
  const [state, formAction] = useActionState(saveTemplateAction, { status: "idle", message: "" } as TemplateActionState);

  // Serves both creating and editing. When editing, a refusal falls back to
  // the stored template rather than to blank — the same rule as the employee
  // edit form: what was typed wins while it exists (#74).
  const submitted = state.values;
  const { touched, onInput, formKey } = useSubmittedValues(
    `${JSON.stringify(state.values ?? null)}|${state.message}`,
  );
  const kept = (name: string, stored: string) => submitted?.[name] ?? stored;

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
      {template ? <input type="hidden" name="templateId" value={template.id} /> : null}

      <div className="grid gap-5">
        <div>
          <label htmlFor="template-name" className={labelClass}>{t("nameLabel")}</label>
          <input key={`name-${formKey}`} id="template-name" name="name" required minLength={2} defaultValue={kept("name", template?.name ?? "")} onInput={onInput} placeholder={t("namePlaceholder")} className={field} />
        </div>

        <div>
          <label htmlFor="template-segment" className={labelClass}>{t("segmentLabel")}</label>
          <select key={`segment-${formKey}`} id="template-segment" name="segment" required defaultValue={kept("segment", template?.segment ?? "construction")} onInput={onInput} className={field}>
            {SEGMENTS.map((segment) => <option key={segment} value={segment}>{t(`segment_${segment}` as "segment_construction")}</option>)}
          </select>
          <p className="mt-2 text-xs text-[#6B7280]">{t("segmentHelp")}</p>
        </div>

        <div>
          <label htmlFor="template-description" className={labelClass}>{t("descriptionLabel")}</label>
          <textarea key={`description-${formKey}`} id="template-description" name="description" rows={3} defaultValue={kept("description", template?.description ?? "")} onInput={onInput} className={`${field} py-3`} />
        </div>
      </div>

      {state.status === "error" && !touched ? (
        <p role="alert" className="mt-6 rounded-lg bg-red-400/10 p-4 text-sm leading-6 text-red-300">{state.message}</p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/dashboard/field-reports/templates" className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("cancel")}</Link>
        <button type="submit" className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]">
          {template ? t("saveChanges") : t("createTemplate")}
        </button>
      </div>
    </form>
  );
}
