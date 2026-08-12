import Link from "next/link";
import { getTranslations } from "next-intl/server";

// `areas` sits right after the overview because it is the structure of the
// location — the subdivisions everything else is reported against — rather
// than one more thing that happened at it (#77).
export const SITE_TABS = ["overview", "areas", "presence", "weather", "hours", "reports", "team", "partners"] as const;
export type SiteTab = (typeof SITE_TABS)[number];

export function isSiteTab(value: string | undefined): value is SiteTab {
  return SITE_TABS.includes((value ?? "") as SiteTab);
}

/**
 * Tabs are links carrying `?tab=`, not client state: the server already has to
 * fetch per-tab data, and a URL that can be shared or reloaded is worth more
 * than avoiding a navigation.
 */
export default async function SiteDashboardTabs({
  siteId,
  active,
  counts,
}: {
  siteId: string;
  active: SiteTab;
  counts: Partial<Record<SiteTab, number>>;
}) {
  const t = await getTranslations("sites");

  return (
    <nav aria-label={t("tabsLabel")} className="mt-6 overflow-x-auto border-b border-white/10">
      <ul className="flex min-w-max gap-1">
        {SITE_TABS.map((tab) => {
          const isActive = tab === active;
          const count = counts[tab];
          return (
            <li key={tab}>
              <Link
                href={`/dashboard/sites/${siteId}?tab=${tab}`}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition ${
                  isActive
                    ? "border-[#22C55E] text-[#E5E7EB]"
                    : "border-transparent text-[#9CA3AF] hover:border-white/20 hover:text-[#E5E7EB]"
                }`}
              >
                {t(`tab_${tab}` as "tab_overview")}
                {count ? (
                  <span className="rounded-full bg-white/10 px-2 text-xs font-bold text-[#D1D5DB]">{count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
