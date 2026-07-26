"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  moveFieldAction,
  removeFieldAction,
  saveFieldAction,
  type TemplateActionState,
} from "@/src/features/operational-reports/template-actions";
import type { ReportFieldType, ReportTemplateField } from "@/lib/types/operational-reports";

const FIELD_TYPES: ReportFieldType[] = ["text", "number", "date", "boolean", "select", "multiselect", "checklist", "photo", "signature"];
const CHOICE_TYPES: ReportFieldType[] = ["select", "multiselect", "checklist"];

const input = "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-base text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20";
const labelClass = "text-sm font-medium text-[#E5E7EB]";

export default function TemplateFieldEditor({ templateId, fields, editing }: { templateId: string; fields: ReportTemplateField[]; editing?: ReportTemplateField }) {
  const t = useTranslations("reportTemplates");
  const router = useRouter();
  const [state, formAction] = useActionState(saveFieldAction, { status: "idle", message: "" } as TemplateActionState);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldType, setFieldType] = useState<ReportFieldType>(editing?.fieldType ?? "text");

  function run(fn: () => Promise<{ ok: boolean; message: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.message);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      {error ? <p role="alert" className="rounded-lg bg-red-400/10 p-4 text-sm text-red-300">{error}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("fieldsTitle")}</h2>
        <p className="mt-1 text-sm text-[#9CA3AF]">{t("fieldsDescription")}</p>

        {fields.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-white/15 px-4 py-8 text-center text-sm text-[#6B7280]">{t("noFields")}</p>
        ) : (
          <ol className="mt-6 grid gap-3">
            {fields.map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#111C33] p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#E5E7EB]">
                    {item.label}
                    {item.required ? <span className="ml-1.5 text-red-300" title={t("requiredLabel")}>*</span> : null}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[#6B7280]">
                    {item.key} · {t(`type_${item.fieldType}` as "type_text")}
                    {CHOICE_TYPES.includes(item.fieldType) ? ` · ${t("optionCount", { count: item.options.length })}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" aria-label={t("moveUp")} disabled={pending || index === 0} onClick={() => run(() => moveFieldAction(templateId, item.id, "up"))} className="min-h-11 min-w-11 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB] disabled:opacity-30">↑</button>
                  <button type="button" aria-label={t("moveDown")} disabled={pending || index === fields.length - 1} onClick={() => run(() => moveFieldAction(templateId, item.id, "down"))} className="min-h-11 min-w-11 rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB] disabled:opacity-30">↓</button>
                  <Link href={`/dashboard/field-reports/templates/${templateId}?field=${item.id}`} className="flex min-h-11 items-center px-3 text-sm font-semibold text-[#22C55E] hover:text-[#16A34A]">{t("edit")}</Link>
                  <button type="button" disabled={pending} onClick={() => { if (window.confirm(t("removeFieldConfirm"))) run(() => removeFieldAction(templateId, item.id)); }} className="min-h-11 px-3 text-sm font-semibold text-red-300 hover:text-red-200 disabled:opacity-50">{t("remove")}</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form action={formAction} className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
        <input type="hidden" name="templateId" value={templateId} />
        {editing ? <input type="hidden" name="fieldId" value={editing.id} /> : null}

        <h2 className="text-lg font-semibold text-[#E5E7EB]">{editing ? t("editField") : t("addField")}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="field-label" className={labelClass}>{t("fieldLabelLabel")}</label>
            <input id="field-label" name="label" required defaultValue={editing?.label} placeholder={t("fieldLabelPlaceholder")} className={input} />
          </div>

          <div>
            <label htmlFor="field-key" className={labelClass}>{t("fieldKeyLabel")}</label>
            <input id="field-key" name="key" required defaultValue={editing?.key} placeholder="panels_installed" pattern="[a-zA-Z0-9_ ]+" className={`${input} font-mono`} />
            <p className="mt-2 text-xs text-[#6B7280]">{t("fieldKeyHelp")}</p>
          </div>

          <div>
            <label htmlFor="field-type" className={labelClass}>{t("fieldTypeLabel")}</label>
            <select id="field-type" name="fieldType" required value={fieldType} onChange={(event) => setFieldType(event.target.value as ReportFieldType)} className={input}>
              {FIELD_TYPES.map((type) => <option key={type} value={type}>{t(`type_${type}` as "type_text")}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm text-[#D1D5DB]">
              <input type="checkbox" name="required" defaultChecked={editing?.required} className="h-5 w-5 rounded border-white/20 accent-[#22C55E]" />
              {t("requiredLabel")}
            </label>
          </div>

          {CHOICE_TYPES.includes(fieldType) ? (
            <div className="sm:col-span-2">
              <label htmlFor="field-options" className={labelClass}>{t("optionsLabel")}</label>
              <textarea
                id="field-options"
                name="options"
                rows={5}
                defaultValue={editing?.options.map((option) => (option.value === option.label ? option.value : `${option.value}|${option.label}`)).join("\n")}
                placeholder={t("optionsPlaceholder")}
                className={`${input} py-3 font-mono text-sm`}
              />
              <p className="mt-2 text-xs leading-5 text-[#6B7280]">{t("optionsHelp")}</p>
            </div>
          ) : null}
        </div>

        {state.status === "error" ? (
          <p role="alert" className="mt-6 rounded-lg bg-red-400/10 p-4 text-sm leading-6 text-red-300">{state.message}</p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {editing ? (
            <Link href={`/dashboard/field-reports/templates/${templateId}`} className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5">{t("cancel")}</Link>
          ) : null}
          <button type="submit" className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]">
            {editing ? t("saveField") : t("addField")}
          </button>
        </div>
      </form>
    </div>
  );
}
