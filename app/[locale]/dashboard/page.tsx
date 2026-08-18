import Link from "next/link";
import { getTranslations } from "next-intl/server";
import KpiGrid from "@/components/dashboard/KpiGrid";
import RoleOverview from "@/components/dashboard/RoleOverview";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import { getDashboardOverview, getRoleDashboardOverview } from "@/src/features/dashboard/data";
import PageHeader from "@/components/dashboard/PageHeader";

/**
 * One screen, one question: what needs me today.
 *
 * This page carried seven blocks stacked down it — a role summary, a KPI grid,
 * a weekly hours chart, a live map, recent timesheets, team activity and a
 * quick-actions strip. Nothing there was wrong, and together they asked the
 * reader to decide what mattered before they could act on any of it. The
 * people using this are site managers and workers on a phone, not analysts.
 *
 * The four that were removed are not gone: the map is `/dashboard/map`, the
 * timesheets `/dashboard/timesheets`, the hours `/dashboard/reports`, the team
 * `/dashboard/teams`. Every one already has a menu entry, which is why they
 * could leave — verified against `defaultAppNavigation` rather than assumed.
 */
export default async function DashboardPage() {
  const [{ user }, { kpis }, roleOverview, t] = await Promise.all([
    requireAuthenticatedSession(),
    getDashboardOverview(),
    getRoleDashboardOverview(),
    getTranslations("dashboard"),
  ]);
  const firstName = user.name.split(" ")[0];

  return (
    <section aria-labelledby="dashboard-heading">
      <PageHeader
        headingId="dashboard-heading"
        eyebrow={t("eyebrow")}
        title={t("welcome", { name: firstName })}
        description={t("description")}
        /* One action, not two. Inviting somebody is a thing you go and do on
           the employees page; it does not belong beside "clock in". */
        actions={
          <Link
            href="/dashboard/time"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t("addTimeEntry")}
          </Link>
        }
      />

      <div className="mt-8">
        {/* Managers and HR get the role view; everybody else gets their own
            numbers, which is all a worker has ever needed from this screen. */}
        {roleOverview.roleView ? <RoleOverview overview={roleOverview} /> : <KpiGrid kpis={kpis} />}
      </div>
    </section>
  );
}
