"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createOperationalReportAction, updateOperationalReportAction, type FieldValueInput } from "@/src/features/operational-reports/actions";
import type { FieldValue, OperationalReportDetail, ReportTemplate } from "@/lib/types/operational-reports";

const field = "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-base text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20";
const label = "text-sm font-medium text-[#E5E7EB]";

type Props = {
  templates: ReportTemplate[];
  projects: { id: string; name: string }[];
  sites: { id: string; name: string }[];
  existingReport?: OperationalReportDetail;
};

export default function OperationalReportForm({ templates, projects, sites, existingReport }: Props) {
  const t = useTranslations("operationalReports");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [templateId, setTemplateId] = useState(existingReport?.templateId ?? "");
  const [reportDate, setReportDate] = useState(existingReport?.reportDate ?? new Date().toISOString().slice(0, 10));
  const [startsAt, setStartsAt] = useState(existingReport?.startsAt?.slice(0, 16) ?? "");
  const [endsAt, setEndsAt] = useState(existingReport?.endsAt?.slice(0, 16) ?? "");
  const [breakMinutes, setBreakMinutes] = useState(String(existingReport?.breakMinutes ?? 0));
  const [projectId, setProjectId] = useState(existingReport?.projectId ?? "");
  const [siteId, setSiteId] = useState(existingReport?.siteId ?? "");
  const [activity, setActivity] = useState(existingReport?.activity ?? "");
  const [notes, setNotes] = useState(existingReport?.notes ?? "");
  const [values, setValues] = useState<Record<string, FieldValue>>(existingReport?.values ?? {});

  const activeTemplate = useMemo(() => {
    const id = templateId || existingReport?.templateId;
    return templates.find((template) => template.id === id) ?? (existingReport ? { id: existingReport.templateId ?? "", segment: "custom" as const, name: existingReport.templateName ?? "", description: null, fields: existingReport.templateFields } : null);
  }, [templateId, templates, existingReport]);

  function setFieldValue(fieldId: string, value: FieldValue) {
    setValues((current) => ({ ...current, [fieldId]: value }));
  }

  function submit() {
    if (!reportDate) { setFeedback(t("reportDateRequired")); return; }
    const fieldValues: FieldValueInput[] = (activeTemplate?.fields ?? []).map((templateField) => ({
      fieldId: templateField.id,
      fieldType: templateField.fieldType,
      value: values[templateField.key] ?? values[templateField.id] ?? null,
    }));
    const input = {
      templateId: activeTemplate?.id || null,
      reportDate,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      breakMinutes: Number(breakMinutes) || 0,
      projectId: projectId || null,
      siteId: siteId || null,
      activity,
      notes,
      values: fieldValues,
    };
    startTransition(async () => {
      const result = existingReport
        ? await updateOperationalReportAction(existingReport.id, input)
        : await createOperationalReportAction(input);
      setFeedback(result.message);
      if (result.ok && result.reportId) router.push(`/dashboard/field-reports/${result.reportId}`);
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="report-template">{t("template")}</label>
          <select id="report-template" className={field} value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
            <option value="">{t("genericNoTemplate")}</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="report-date">{t("date")}</label>
          <input id="report-date" type="date" required className={field} value={reportDate} onChange={(event) => setReportDate(event.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="report-start">{t("start")}</label>
          <input id="report-start" type="datetime-local" className={field} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="report-end">{t("end")}</label>
          <input id="report-end" type="datetime-local" className={field} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="report-break">{t("breakMinutes")}</label>
          <input id="report-break" type="number" min="0" className={field} value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="report-project">{t("project")}</label>
          <select id="report-project" className={field} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">—</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="report-site">{t("site")}</label>
          <select id="report-site" className={field} value={siteId} onChange={(event) => setSiteId(event.target.value)}>
            <option value="">—</option>
            {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="report-activity">{t("activity")}</label>
          <input id="report-activity" className={field} value={activity} onChange={(event) => setActivity(event.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="report-notes">{t("notes")}</label>
          <textarea id="report-notes" rows={3} className={`${field} min-h-24 py-3`} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
      </div>

      {activeTemplate && activeTemplate.fields.length > 0 ? (
        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">{t("templateFields", { name: activeTemplate.name })}</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {activeTemplate.fields.map((templateField) => {
              const current = values[templateField.key] ?? values[templateField.id] ?? null;
              if (templateField.fieldType === "boolean") {
                return (
                  <label key={templateField.id} className="flex items-center gap-2.5 text-sm text-[#E5E7EB]">
                    <input type="checkbox" checked={Boolean(current)} onChange={(event) => setFieldValue(templateField.key, event.target.checked)} className="h-5 w-5 rounded border-white/20 bg-[#111827] accent-[#22C55E]" />
                    {templateField.label}{templateField.required ? " *" : ""}
                  </label>
                );
              }
              if (templateField.fieldType === "select") {
                return (
                  <div key={templateField.id}>
                    <label className={label}>{templateField.label}{templateField.required ? " *" : ""}</label>
                    <select className={field} value={typeof current === "string" ? current : ""} onChange={(event) => setFieldValue(templateField.key, event.target.value)}>
                      <option value="">—</option>
                      {templateField.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                );
              }
              if (templateField.fieldType === "multiselect" || templateField.fieldType === "checklist") {
                const selected = Array.isArray(current) ? current : [];
                return (
                  <div key={templateField.id} className="sm:col-span-2">
                    <p className={label}>{templateField.label}{templateField.required ? " *" : ""}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {templateField.options.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm text-[#E5E7EB]">
                          <input
                            type="checkbox"
                            checked={selected.includes(option.value)}
                            onChange={(event) => {
                              const next = event.target.checked ? [...selected, option.value] : selected.filter((value) => value !== option.value);
                              setFieldValue(templateField.key, next);
                            }}
                            className="h-4 w-4 rounded border-white/20 bg-[#111827] accent-[#22C55E]"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }
              if (templateField.fieldType === "photo" || templateField.fieldType === "signature") {
                return (
                  <div key={templateField.id}>
                    <label className={label}>{templateField.label}{templateField.required ? " *" : ""}</label>
                    <input placeholder={t("fileUrlPlaceholder")} className={field} value={typeof current === "string" ? current : ""} onChange={(event) => setFieldValue(templateField.key, event.target.value)} />
                  </div>
                );
              }
              return (
                <div key={templateField.id}>
                  <label className={label}>{templateField.label}{templateField.required ? " *" : ""}</label>
                  <input
                    type={templateField.fieldType === "number" ? "number" : templateField.fieldType === "date" ? "date" : "text"}
                    className={field}
                    value={typeof current === "string" || typeof current === "number" ? String(current) : ""}
                    onChange={(event) => setFieldValue(templateField.key, templateField.fieldType === "number" ? Number(event.target.value) : event.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {feedback ? <p role="status" className="mt-6 rounded-lg bg-[#22C55E]/8 p-4 text-sm leading-6 text-[#9CA3AF]">{feedback}</p> : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/dashboard/field-reports" className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5">{t("cancel")}</Link>
        <button type="button" disabled={pending} onClick={submit} className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] disabled:opacity-60">
          {existingReport ? t("saveChanges") : t("saveDraft")}
        </button>
      </div>
    </div>
  );
}
