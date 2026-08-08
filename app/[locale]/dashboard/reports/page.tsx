import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import HoursDivergenceReport from "@/components/reports/HoursDivergenceReport";
import WorkedHoursReport from "@/components/reports/WorkedHoursReport";
import { getHoursDivergenceReport } from "@/src/features/reports/data";
import { getWorkedHoursReport } from "@/src/features/reports/worked-hours";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;

  const [workedHours, divergence, t] = await Promise.all([
    getWorkedHoursReport(month),
    getHoursDivergenceReport(),
    getTranslations("reports"),
  ]);

  return (
    <section aria-labelledby="reports-heading">
      <PageHeader
        headingId="reports-heading"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {/*
        Worked hours first. It is the report a company opens this page for at
        month end; divergence is an insight, and an insight above the figure
        someone came to fetch is the wrong order.
      */}
      <div className="mt-8">
        <WorkedHoursReport report={workedHours} />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("divergenceTitle")}</h2>
        <p className="mt-1 text-sm text-[#9CA3AF]">{t("divergenceSubtitle")}</p>
        <div className="mt-5">
          <HoursDivergenceReport teams={divergence.teams} divergence={divergence.divergence} siteHours={divergence.siteHours} />
        </div>
      </div>
    </section>
  );
}
