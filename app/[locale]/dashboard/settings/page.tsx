import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import SettingsHub, { settingsIcons } from "@/components/settings/SettingsHub";
import { getClientOptions } from "@/src/features/sites/data";
import { getSiteWeatherOverview } from "@/src/features/weather/data";
import { getCompanyRoster } from "@/src/features/roster/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [clients, sites, { members, roleKeys }, t] = await Promise.all([
    getClientOptions(),
    getSiteWeatherOverview(),
    getCompanyRoster(),
    getTranslations("settings"),
  ]);

  const cards = [
    // Clients are companies you have a relationship with, and that is where
    // they are managed now that Projects is gone (#77). The count no longer
    // mentions projects, because there is nothing to count.
    { key: "clients", icon: settingsIcons.clients, title: t("clientsTitle"), description: t("clientsDescription", { clients: clients.length }), href: "/dashboard/companies", linkLabel: t("manageClients") },
    { key: "sites", icon: settingsIcons.sites, title: t("sitesTitle"), description: t("sitesDescription", { sites: sites.length }), href: "/dashboard/sites", linkLabel: t("manageSites") },
    { key: "templates", icon: settingsIcons.templates, title: t("templatesTitle"), description: t("templatesDescription"), linkLabel: t("comingSoon") },
    { key: "languages", icon: settingsIcons.languages, title: t("languagesTitle"), description: t("languagesDescription"), linkLabel: t("perEmployeeChoice") },
    { key: "permissions", icon: settingsIcons.permissions, title: t("permissionsTitle"), description: t("permissionsDescription", { members: members.length, roles: roleKeys.length }), href: "/dashboard/companies/roster", linkLabel: t("managePermissions") },
    { key: "compliance", icon: settingsIcons.compliance, title: t("complianceTitle"), description: t("complianceDescription"), href: "#location-consent", linkLabel: t("viewConsent") },
  ];

  return <section aria-labelledby="settings-heading">
    <PageHeader headingId="settings-heading" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
    <div className="mt-8 grid gap-6">
      <SettingsHub cards={cards} />
    </div>
  </section>;
}
