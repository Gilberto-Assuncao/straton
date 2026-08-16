import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import TemplateList from "@/components/operational-reports/TemplateList";
import { getManagedTemplates } from "@/src/features/operational-reports/data";

export const metadata: Metadata = { title: "Report templates" };

export default async function TemplatesPage() {
  const [templates, t] = await Promise.all([getManagedTemplates(), getTranslations("reportTemplates")]);
  return (
    <section aria-labelledby="templates-heading">
      <Link href="/dashboard/field-reports" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">← {t("backToReports")}</Link>
      <div className="mt-3">
        <PageHeader
          headingId="templates-heading"
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          actions={<Link href="/dashboard/field-reports/templates/new" className="flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{t("newTemplate")}</Link>}
        />
      </div>
      <div className="mt-8"><TemplateList templates={templates} /></div>
    </section>
  );
}
