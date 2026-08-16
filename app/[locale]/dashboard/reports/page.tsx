import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import HoursDivergenceReport from "@/components/reports/HoursDivergenceReport";
import WorkedHoursReport from "@/components/reports/WorkedHoursReport";
import { getHoursDivergenceReport } from "@/src/features/reports/data";
import { getWorkedHoursReport, parseSiteFilter } from "@/src/features/reports/worked-hours";
import { getSites } from "@/src/features/sites/data";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; sites?: string | string[] }>;
}) {
  const { month, sites } = await searchParams;
  // In the URL, so a filtered report can be bookmarked or sent to the
  // accountant and still show the same figures when they open it (#77).
  const siteIds = parseSiteFilter(sites);

  const [workedHours, divergence, locations, t] = await Promise.all([
    getWorkedHoursReport(month, siteIds),
    getHoursDivergenceReport(),
    getSites(),
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
        <WorkedHoursReport
          report={workedHours}
          locations={locations.map((location) => ({ id: location.id, name: location.name }))}
        />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-ink">{t("divergenceTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("divergenceSubtitle")}</p>
        <div className="mt-5">
          <HoursDivergenceReport teams={divergence.teams} divergence={divergence.divergence} siteHours={divergence.siteHours} />
        </div>
      </div>
    </section>
  );
}
