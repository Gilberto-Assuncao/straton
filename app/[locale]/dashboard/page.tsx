import Link from "next/link";
import { getTranslations } from "next-intl/server";
import KpiGrid from "@/components/dashboard/KpiGrid";
import LiveMapPreview from "@/components/dashboard/LiveMapPreview";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentTimesheets from "@/components/dashboard/RecentTimesheets";
import RoleOverview from "@/components/dashboard/RoleOverview";
import TeamActivity from "@/components/dashboard/TeamActivity";
import WeeklyHoursChart from "@/components/dashboard/WeeklyHoursChart";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import { getDashboardOverview, getRoleDashboardOverview } from "@/src/features/dashboard/data";
import { getLivePresence } from "@/src/features/operations/data";
import PageHeader from "@/components/dashboard/PageHeader";

export default async function DashboardPage() {
  const [{ user }, { kpis, weeklyHours, teamActivities, recentTimesheets }, livePresence, roleOverview, t] = await Promise.all([
    requireAuthenticatedSession(),
    getDashboardOverview(),
    getLivePresence(),
    getRoleDashboardOverview(),
    getTranslations("dashboard"),
  ]);
  const firstName = user.name.split(" ")[0];

  return (
    <section aria-labelledby="dashboard-heading">
      <PageHeader headingId="dashboard-heading" eyebrow={t("eyebrow")} title={t("welcome", { name: firstName })} description={t("description")} actions={<><Link href="/dashboard/time" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#22C55E] px-4 text-sm font-semibold text-[#07110B] transition hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]">{t("addTimeEntry")}</Link><Link href="/dashboard/employees/new" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-[#E5E7EB] transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("inviteEmployee")}</Link></>} />
      <div className="mt-8"><RoleOverview overview={roleOverview} /></div>
      {roleOverview.roleView ? null : <div><KpiGrid kpis={kpis} /></div>}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]"><WeeklyHoursChart data={weeklyHours} /><LiveMapPreview sites={livePresence} /></div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]"><RecentTimesheets timesheets={recentTimesheets} /><TeamActivity activities={teamActivities} /></div>
      <div className="mt-4"><QuickActions /></div>
    </section>
  );
}
