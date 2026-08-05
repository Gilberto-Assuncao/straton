import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import IncomingInvitations from "@/components/sites/IncomingInvitations";
import SiteList from "@/components/sites/SiteList";
import SiteWeatherOverview from "@/components/weather/SiteWeatherOverview";
import { getSites } from "@/src/features/sites/data";
import { getIncomingInvitations } from "@/src/features/sites/partners";
import { getSiteWeatherOverview } from "@/src/features/weather/data";

export const metadata: Metadata = { title: "Sites" };

export default async function SitesPage() {
  const [sites, weather, invitations, t] = await Promise.all([
    getSites(),
    getSiteWeatherOverview(),
    getIncomingInvitations(),
    getTranslations("sites"),
  ]);
  return (
    <section aria-labelledby="sites-heading">
      <PageHeader
        headingId="sites-heading"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<Link href="/dashboard/sites/new" className="flex min-h-11 items-center rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]">{t("newSite")}</Link>}
      />
      <div className="mt-8">
        <IncomingInvitations invitations={invitations} />
        <SiteList sites={sites} />
      </div>
      {weather.length ? (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("weatherTitle")}</h2>
          <p className="mt-1 text-sm text-[#9CA3AF]">{t("weatherDescription")}</p>
          <div className="mt-5"><SiteWeatherOverview sites={weather} /></div>
        </div>
      ) : null}
    </section>
  );
}
