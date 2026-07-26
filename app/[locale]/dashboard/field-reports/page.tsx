import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import ReportsList from "@/components/operational-reports/ReportsList";
import { getOperationalReports } from "@/src/features/operational-reports/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("operationalReports");
  return { title: t("metadataTitle") };
}

export default async function FieldReportsPage() {
  const [t, { reports, canReviewAll }] = await Promise.all([
    getTranslations("operationalReports"),
    getOperationalReports(),
  ]);
  return (
    <section aria-labelledby="field-reports-heading">
      <PageHeader
        headingId="field-reports-heading"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={canReviewAll ? t("descriptionReviewer") : t("descriptionOwn")}
        actions={<><Link href="/dashboard/field-reports/templates" className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5">{t("templates")}</Link><Link href="/dashboard/field-reports/new" className="inline-flex min-h-11 items-center rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A]">{t("newReport")}</Link></>}
      />
      <div className="mt-8"><ReportsList reports={reports} /></div>
    </section>
  );
}
