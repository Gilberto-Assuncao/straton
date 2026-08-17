"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { TemplateMessageKey } from "@/src/features/operational-reports/messages";
import { setTemplateActiveAction } from "@/src/features/operational-reports/template-actions";
import type { ManagedTemplate } from "@/src/features/operational-reports/data";

export default function TemplateList({ templates }: { templates: ManagedTemplate[] }) {
  const t = useTranslations("reportTemplates");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<TemplateMessageKey | null>(null);

  function toggle(template: ManagedTemplate) {
    if (template.active && !window.confirm(t("deactivateConfirm"))) return;
    setError(null);
    startTransition(async () => {
      const result = await setTemplateActiveAction(template.id, !template.active);
      if (!result.ok) setError(result.messageKey);
      else router.refresh();
    });
  }

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge-15 bg-surface px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink-muted">{t("empty")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-subtle">{t("emptyHelp")}</p>
        <Link href="/dashboard/field-reports/templates/new" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover">{t("newTemplate")}</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? <p role="alert" className="rounded-lg bg-red-400/10 p-4 text-sm text-red-300">{t(error)}</p> : null}
      {templates.map((template) => (
        <article key={template.id} className={`rounded-2xl border border-edge-10 bg-surface p-5 ${template.active ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-semibold text-ink">{template.name}</h3>
                <span className="inline-flex min-h-7 items-center rounded-full bg-edge-5 px-3 text-xs font-medium text-ink-muted">
                  {t(`segment_${template.segment}` as "segment_construction")}
                </span>
                {template.active ? null : (
                  <span className="inline-flex min-h-7 items-center rounded-full bg-edge-10 px-3 text-xs font-semibold text-ink-muted">{t("inactive")}</span>
                )}
              </div>
              {template.description ? <p className="mt-1.5 text-sm text-ink-muted">{template.description}</p> : null}
              <p className="mt-2 text-xs text-ink-subtle">
                {t("fieldCount", { count: template.fields.length })}
                {template.reportCount > 0 ? ` · ${t("reportCount", { count: template.reportCount })}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Link href={`/dashboard/field-reports/templates/${template.id}`} className="flex min-h-11 items-center px-3 text-sm font-semibold text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-brand">{t("edit")}</Link>
              <button type="button" onClick={() => toggle(template)} disabled={pending} className="min-h-11 px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand">
                {template.active ? t("deactivate") : t("reactivate")}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
