"use client";

import { useActionState, useState, useTransition } from "react";
import { useSubmittedValues } from "@/components/auth/useSubmittedValues";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TemplateMessageKey } from "@/src/features/operational-reports/messages";
import {
  moveFieldAction,
  removeFieldAction,
  saveFieldAction,
  type TemplateActionState,
} from "@/src/features/operational-reports/template-actions";
import type { ReportFieldType, ReportTemplateField } from "@/lib/types/operational-reports";

const FIELD_TYPES: ReportFieldType[] = ["text", "number", "date", "boolean", "select", "multiselect", "checklist", "photo", "signature"];
const CHOICE_TYPES: ReportFieldType[] = ["select", "multiselect", "checklist"];

const input = "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-surface-alt px-4 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelClass = "text-sm font-medium text-ink";

export default function TemplateFieldEditor({ templateId, fields, editing }: { templateId: string; fields: ReportTemplateField[]; editing?: ReportTemplateField }) {
  const t = useTranslations("reportTemplates");
  const router = useRouter();
  const [state, formAction] = useActionState(saveFieldAction, { status: "idle", messageKey: null } as TemplateActionState);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<TemplateMessageKey | null>(null);
  const [fieldType, setFieldType] = useState<ReportFieldType>(editing?.fieldType ?? "text");

  // Only the uncontrolled fields need this. `fieldType` lives in state above
  // and therefore already survives a refusal — React resets the form's DOM
  // values after an action, not the component's state (#74).
  const submitted = state.values;
  const { touched, onInput, formKey } = useSubmittedValues(
    `${JSON.stringify(state.values ?? null)}|${state.messageKey ?? ""}`,
  );
  const kept = (name: string, stored: string) => submitted?.[name] ?? stored;

  function run(fn: () => Promise<{ ok: boolean; messageKey: TemplateMessageKey }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.messageKey);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      {error ? <p role="alert" className="rounded-lg bg-red-400/10 p-4 text-sm text-red-300">{t(error)}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
        <h2 className="text-lg font-semibold text-ink">{t("fieldsTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("fieldsDescription")}</p>

        {fields.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-white/15 px-4 py-8 text-center text-sm text-ink-subtle">{t("noFields")}</p>
        ) : (
          <ol className="mt-6 grid gap-3">
            {fields.map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-inset p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {item.label}
                    {item.required ? <span className="ml-1.5 text-red-300" title={t("requiredLabel")}>*</span> : null}
                  </p>
                  <p className="mt-1 font-mono text-xs text-ink-subtle">
                    {item.key} · {t(`type_${item.fieldType}` as "type_text")}
                    {CHOICE_TYPES.includes(item.fieldType) ? ` · ${t("optionCount", { count: item.options.length })}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" aria-label={t("moveUp")} disabled={pending || index === 0} onClick={() => run(() => moveFieldAction(templateId, item.id, "up"))} className="min-h-11 min-w-11 rounded-lg text-ink-muted hover:bg-white/5 hover:text-ink disabled:opacity-30">↑</button>
                  <button type="button" aria-label={t("moveDown")} disabled={pending || index === fields.length - 1} onClick={() => run(() => moveFieldAction(templateId, item.id, "down"))} className="min-h-11 min-w-11 rounded-lg text-ink-muted hover:bg-white/5 hover:text-ink disabled:opacity-30">↓</button>
                  <Link href={`/dashboard/field-reports/templates/${templateId}?field=${item.id}`} className="flex min-h-11 items-center px-3 text-sm font-semibold text-brand hover:text-brand-hover">{t("edit")}</Link>
                  <button type="button" disabled={pending} onClick={() => { if (window.confirm(t("removeFieldConfirm"))) run(() => removeFieldAction(templateId, item.id)); }} className="min-h-11 px-3 text-sm font-semibold text-red-300 hover:text-red-200 disabled:opacity-50">{t("remove")}</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <form action={formAction} className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-7">
        <input type="hidden" name="templateId" value={templateId} />
        {editing ? <input type="hidden" name="fieldId" value={editing.id} /> : null}

        <h2 className="text-lg font-semibold text-ink">{editing ? t("editField") : t("addField")}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="field-label" className={labelClass}>{t("fieldLabelLabel")}</label>
            <input key={`label-${formKey}`} id="field-label" name="label" required defaultValue={kept("label", editing?.label ?? "")} onInput={onInput} placeholder={t("fieldLabelPlaceholder")} className={input} />
          </div>

          <div>
            <label htmlFor="field-key" className={labelClass}>{t("fieldKeyLabel")}</label>
            <input key={`key-${formKey}`} id="field-key" name="key" required defaultValue={kept("key", editing?.key ?? "")} onInput={onInput} placeholder="panels_installed" pattern="[a-zA-Z0-9_ ]+" className={`${input} font-mono`} />
            <p className="mt-2 text-xs text-ink-subtle">{t("fieldKeyHelp")}</p>
          </div>

          <div>
            <label htmlFor="field-type" className={labelClass}>{t("fieldTypeLabel")}</label>
            <select id="field-type" name="fieldType" required value={fieldType} onChange={(event) => setFieldType(event.target.value as ReportFieldType)} className={input}>
              {FIELD_TYPES.map((type) => <option key={type} value={type}>{t(`type_${type}` as "type_text")}</option>)}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm text-ink-soft">
              <input key={`required-${formKey}`} type="checkbox" name="required" defaultChecked={submitted ? submitted.required === "on" : editing?.required} onInput={onInput} className="h-5 w-5 rounded border-white/20 accent-brand" />
              {t("requiredLabel")}
            </label>
          </div>

          {CHOICE_TYPES.includes(fieldType) ? (
            <div className="sm:col-span-2">
              <label htmlFor="field-options" className={labelClass}>{t("optionsLabel")}</label>
              <textarea
                key={`options-${formKey}`}
                id="field-options"
                name="options"
                rows={5}
                defaultValue={kept(
                  "options",
                  editing?.options.map((option) => (option.value === option.label ? option.value : `${option.value}|${option.label}`)).join("\n") ?? "",
                )}
                onInput={onInput}
                placeholder={t("optionsPlaceholder")}
                className={`${input} py-3 font-mono text-sm`}
              />
              <p className="mt-2 text-xs leading-5 text-ink-subtle">{t("optionsHelp")}</p>
            </div>
          ) : null}
        </div>

        {/* Keyed off the message, not the status: `messageKey` is null while
            idle, and testing it is what tells the compiler there is a key here. */}
        {state.messageKey && !touched ? (
          <p role="alert" className="mt-6 rounded-lg bg-red-400/10 p-4 text-sm leading-6 text-red-300">{t(state.messageKey)}</p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {editing ? (
            <Link href={`/dashboard/field-reports/templates/${templateId}`} className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-ink hover:bg-white/5">{t("cancel")}</Link>
          ) : null}
          <button type="submit" className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            {editing ? t("saveField") : t("addField")}
          </button>
        </div>
      </form>
    </div>
  );
}
