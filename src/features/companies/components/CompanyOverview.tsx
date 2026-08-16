"use client";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { DashboardCard, KpiCard } from "@/src/components/dashboard";
import { CompanyDetailsForm } from "./CompanyDetailsForm";
import { CompanySettingsForm } from "./CompanySettingsForm";
import { CompanyStatusBadge } from "./CompanyStatusBadge";
import { CompanyDangerZone } from "./CompanyDangerZone";
import type { CompanyDetail } from "../types";

export function CompanyOverview({ company }: { company: CompanyDetail }) {
  const t = useTranslations("companies");
  // Was `toLocaleDateString("en-BE")` — Belgian *English*, whatever language the
  // person had chosen.
  const format = useFormatter();

  const edit = company.permissions.includes("edit_profile");
  const settings = company.permissions.includes("edit_settings");
  const initials = company.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand/10 font-bold text-brand"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            {/* Was "Company Management · Sprint 3.8" — an internal sprint number
                on a customer's screen. */}
            <p className="text-sm text-brand">{t("overviewEyebrow")}</p>
            <h1 className="truncate text-2xl font-bold sm:text-3xl">{company.displayName}</h1>
            <p className="mt-1 text-sm text-ink-muted">{company.legalName}</p>
          </div>
        </div>
        <CompanyStatusBadge status={company.status} />
      </header>

      <section aria-label={t("companyStatistics")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t("members")} value={company.memberCounts.total} trend={t("statusActiveCount")} />
        <KpiCard title={t("teams")} value={company.teamCounts.total} trend={t("activeTeams")} />
        <KpiCard title={t("activeProjects")} value={company.activeProjects} />
        <KpiCard title={t("companyStatus")} value={t(`status_${company.status}` as "status_active")} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <DashboardCard title={t("companyProfile")} description={t("companyInformationDesc")}>
          <CompanyDetailsForm companyId={company.id} values={company} canEdit={edit} />
        </DashboardCard>

        <div className="space-y-6">
          <DashboardCard title={t("companyInformation")}>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-ink-muted">{t("country")}</dt>
                <dd>{company.countryCode ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t("timezone")}</dt>
                <dd>{company.timezone}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t("currency")}</dt>
                <dd>{company.currencyCode}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">{t("created")}</dt>
                <dd>{format.dateTime(new Date(company.createdAt), { dateStyle: "medium" })}</dd>
              </div>
            </dl>
          </DashboardCard>

          <DashboardCard title={t("membersSummary")} description={t("membersSummaryDesc")}>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>{t("statusActiveCount")}</span>
                <strong>{company.memberCounts.active}</strong>
              </li>
              <li className="flex justify-between">
                <span>{t("statusInvitedCount")}</span>
                <strong>{company.memberCounts.invited}</strong>
              </li>
              <li className="flex justify-between">
                <span>{t("statusSuspendedCount")}</span>
                <strong>{company.memberCounts.suspended}</strong>
              </li>
            </ul>
            {/* Points at /dashboard/employees now: Workforce left the sidebar in
                #36 and People is where you manage anyone. */}
            <Link href="/dashboard/employees" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand">
              {t("openWorkforce")}
            </Link>
          </DashboardCard>

          <DashboardCard title={t("teamsSummary")}>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>{t("activeTeams")}</span>
                <strong>{company.teamCounts.active}</strong>
              </li>
              <li className="flex justify-between">
                <span>{t("assignedLeaders")}</span>
                <strong>{company.teamCounts.leaders}</strong>
              </li>
              <li className="flex justify-between">
                <span>{t("teamMemberships")}</span>
                <strong>{company.teamCounts.members}</strong>
              </li>
            </ul>
            <Link href="/dashboard/teams" className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand">
              {t("openTeams")}
            </Link>
          </DashboardCard>
        </div>
      </div>

      <div id="company-settings" className="scroll-mt-28">
        <DashboardCard title={t("companySettings")} description={t("companySettingsDesc")}>
          <CompanySettingsForm companyId={company.id} values={company.settings} canEdit={settings} />
        </DashboardCard>
      </div>

      <CompanyDangerZone
        companyId={company.id}
        status={company.status}
        canArchive={company.permissions.includes("archive")}
        canReactivate={company.permissions.includes("reactivate")}
      />
    </div>
  );
}
