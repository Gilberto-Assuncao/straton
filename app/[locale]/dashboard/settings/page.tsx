import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import LocationConsentToggle from "@/components/settings/LocationConsentToggle";
import SettingsHub, { settingsIcons } from "@/components/settings/SettingsHub";
import { getLocationConsent } from "@/src/features/account/data";
import { getProjects } from "@/src/features/projects/data";
import { getSiteWeatherOverview } from "@/src/features/weather/data";
import { getCompanyRoster } from "@/src/features/roster/data";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [locationConsent, { clients, projects }, sites, { members, roleKeys }, t] = await Promise.all([
    getLocationConsent(),
    getProjects(),
    getSiteWeatherOverview(),
    getCompanyRoster(),
    getTranslations("settings"),
  ]);

  const cards = [
    { key: "clients", icon: settingsIcons.clients, title: t("clientsTitle"), description: t("clientsDescription", { clients: clients.length, projects: projects.length }), href: "/dashboard/projects", linkLabel: t("manageClients") },
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
      <div id="location-consent"><LocationConsentToggle initialConsent={locationConsent} /></div>
    </div>
  </section>;
}
