import { getTranslations } from "next-intl/server";
import type { TeamActivityItem } from "@/lib/types/dashboard";

export default async function TeamActivity({ activities }: { activities: TeamActivityItem[] }) {
  const t = await getTranslations("dashboard");
  return (
    <section aria-labelledby="team-activity-title" className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6">
      <h3 id="team-activity-title" className="text-lg font-semibold text-ink">{t("teamActivityTitle")}</h3><p className="mt-1 text-xs text-ink-muted">{t("teamActivitySubtitle")}</p>
      {activities.length === 0 ? <p className="py-12 text-center text-sm text-ink-muted">{t("teamActivityEmpty")}</p> : <ol className="mt-6 space-y-5">{activities.map((activity) => <li key={activity.id} className="flex gap-3"><span aria-hidden="true" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm text-brand">{activity.type === "shift_started" ? "▶" : activity.type === "timesheet_approved" ? "✓" : activity.type === "location_updated" ? "↻" : "↑"}</span><div className="min-w-0"><p className="text-sm leading-6 text-ink-soft"><strong className="font-semibold text-ink">{activity.person}</strong> {activity.action}</p><p className="truncate text-xs text-ink-muted">{activity.context} · {activity.time}</p></div></li>)}</ol>}
    </section>
  );
}
