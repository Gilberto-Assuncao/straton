import Link from "next/link";
import { getTranslations } from "next-intl/server";
import KpiGrid from "@/components/dashboard/KpiGrid";
import WeeklyHoursChart from "@/components/dashboard/WeeklyHoursChart";
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
 * The map and the recent timesheets are not gone — `/dashboard/map` and
 * `/dashboard/timesheets`, both reachable by every role.
 *
 * The weekly hours are a different case, and the first version of this got it
 * wrong. `/dashboard/reports` is `managerRoles`, so removing the chart left a
 * worker with no chart *and* no route to one: removed, not relocated. Their own
 * hours are the one thing a worker comes to this screen for, so the chart stays
 * for them and only for them. (Found in review of #118 — correctly, against my
 * claim to the contrary, which came from a parser of mine that only recognised
 * a `roles` list written as an array and missed `roles: managerRoles`.)
 *
 * Team activity is removed for workers on purpose rather than by oversight:
 * `/dashboard/teams` is manager-only too, but that block is colleagues' data,
 * not theirs, and a worker's dashboard is their own punch and their own week.
 */
export default async function DashboardPage() {
  const [{ user }, roleOverview, t] = await Promise.all([
    requireAuthenticatedSession(),
    getRoleDashboardOverview(),
    getTranslations("dashboard"),
  ]);

  /*
   * Only fetched when it is going to be rendered.
   *
   * `getDashboardOverview()` runs six queries and derives `weeklyHours`,
   * `teamActivities` and `recentTimesheets` — the three blocks this page just
   * stopped showing. Left in the `Promise.all` above it did all of that work on
   * every load and threw it away, and for a manager or HR even the `kpis` went
   * unused, because they get `RoleOverview` instead. Removing the blocks
   * without removing their cost is most of the way to not having removed them.
   * (Found in review of #118.)
   *
   * This serialises two calls for a worker. That is the smaller cost: the role
   * overview is one round trip, and the alternative is a second entry point
   * into the same six queries.
   */
  const overview = roleOverview.roleView ? null : await getDashboardOverview();
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
            numbers and their own week. */}
        {roleOverview.roleView ? (
          <RoleOverview overview={roleOverview} />
        ) : (
          <div className="grid gap-4">
            <KpiGrid kpis={overview!.kpis} />
            <WeeklyHoursChart data={overview!.weeklyHours} />
          </div>
        )}
      </div>
    </section>
  );
}
