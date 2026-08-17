import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import OperationalReportForm from "@/components/operational-reports/OperationalReportForm";
import { getReportTemplates, getSiteOptions } from "@/src/features/operational-reports/data";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "New Field Report" };

export default async function NewFieldReportPage() {
  const [templates, { sites }, t] = await Promise.all([getReportTemplates(), getSiteOptions(), getTranslations("operationalReports")]);
  return (
    <section aria-labelledby="new-field-report-heading" className="mx-auto max-w-4xl">
      <Link href="/dashboard/field-reports" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink">← {t("backToList")}</Link>
      <div className="mb-6 mt-3">
        <PageHeader headingId="new-field-report-heading" title={t("newReportTitle")} description={t("newReportHelp")} />
      </div>
      <OperationalReportForm templates={templates} sites={sites} />
    </section>
  );
}
