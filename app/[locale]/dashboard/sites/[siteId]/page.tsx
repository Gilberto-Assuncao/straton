import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import SiteDashboardTabs, { isSiteTab, type SiteTab } from "@/components/sites/SiteDashboardTabs";
import {
  HoursPanel,
  OverviewPanel,
  PresencePanel,
  ReportsPanel,
  TeamPanel,
  WeatherPanel,
} from "@/components/sites/SiteDashboardPanels";
import SitePartners from "@/components/sites/SitePartners";
import { getSiteById, getSiteDashboard } from "@/src/features/sites/data";
import { getInvitableCompanies, getSitePartners } from "@/src/features/sites/partners";
import { getSiteWeather } from "@/src/features/weather/data";

export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getSiteById(siteId);
  return { title: site ? site.name : "Site" };
}

export default async function SiteDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ siteId }, { tab }, t] = await Promise.all([params, searchParams, getTranslations("sites")]);
  const active: SiteTab = isSiteTab(tab) ? tab : "overview";

  const [site, data] = await Promise.all([getSiteById(siteId), getSiteDashboard(siteId)]);
  if (!site) notFound();

  // Only fetched when the tab is open: the forecast is an outbound HTTP call,
  // and paying for it on every other tab would slow the whole page down.
  const weather = active === "weather" || active === "overview" ? await getSiteWeather(siteId) : null;

  // Same reasoning: three extra queries that only the partners tab reads.
  const partners = active === "partners" ? await getSitePartners(siteId) : [];
  const invitable = active === "partners" ? await getInvitableCompanies(siteId) : [];

  return (
    <section aria-labelledby="site-heading">
      <Link href="/dashboard/sites" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]">← {t("backToSites")}</Link>
      <div className="mt-3">
        <PageHeader
          headingId="site-heading"
          eyebrow={site.projectName ?? t("eyebrow")}
          title={site.name}
          description={[site.address.street, site.address.postal_code, site.address.city].filter(Boolean).join(", ") || t("noAddress")}
          actions={
            <Link href={`/dashboard/sites/${site.id}/edit`} className="flex min-h-11 items-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("edit")}</Link>
          }
        />
      </div>

      <SiteDashboardTabs
        siteId={site.id}
        active={active}
        counts={{
          presence: data.presentToday.length,
          hours: data.hours.entries.length,
          reports: data.reports.length,
          team: data.team.length,
          partners: partners.filter((partner) => partner.status === "accepted").length,
        }}
      />

      <div className="mt-8">
        {active === "overview" ? <OverviewPanel site={site} data={data} /> : null}
        {active === "presence" ? <PresencePanel data={data} /> : null}
        {active === "weather" ? <WeatherPanel weather={weather} /> : null}
        {active === "hours" ? <HoursPanel data={data} /> : null}
        {active === "reports" ? <ReportsPanel data={data} /> : null}
        {active === "team" ? <TeamPanel data={data} /> : null}
        {active === "partners" ? (
          <SitePartners siteId={site.id} partners={partners} invitable={invitable} hasProject={Boolean(site.projectId)} />
        ) : null}
      </div>
    </section>
  );
}
