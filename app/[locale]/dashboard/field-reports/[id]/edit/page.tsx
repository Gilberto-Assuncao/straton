import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import OperationalReportForm from "@/components/operational-reports/OperationalReportForm";
import { getOperationalReportDetail, getReportTemplates, getSiteOptions } from "@/src/features/operational-reports/data";
import { requireActiveCompany } from "@/src/application/session/server";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Edit Field Report" };

const editableStatuses = ["draft", "changes_requested"];

export default async function EditFieldReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ session }, report, templates, { sites }, t] = await Promise.all([
    requireActiveCompany(),
    getOperationalReportDetail(id),
    getReportTemplates(),
    getSiteOptions(),
    getTranslations("operationalReports"),
  ]);
  if (!report) notFound();
  if (report.workerId !== session.user.id || !editableStatuses.includes(report.status)) redirect(`/dashboard/field-reports/${id}`);

  return (
    <section aria-labelledby="edit-field-report-heading" className="mx-auto max-w-4xl">
      <Link href={`/dashboard/field-reports/${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink">← {t("backToReport")}</Link>
      <div className="mb-6 mt-3">
        <PageHeader headingId="edit-field-report-heading" title={t("editReportTitle")} description={t("editReportHelp")} />
      </div>
      <OperationalReportForm templates={templates} sites={sites} existingReport={report} />
    </section>
  );
}
