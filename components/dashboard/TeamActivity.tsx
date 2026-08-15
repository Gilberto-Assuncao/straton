import { getTranslations } from "next-intl/server";
import type { TeamActivityItem } from "@/lib/types/dashboard";

export default async function TeamActivity({ activities }: { activities: TeamActivityItem[] }) {
  const t = await getTranslations("dashboard");
  return (
    <section aria-labelledby="team-activity-title" className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6">
      <h3 id="team-activity-title" className="text-lg font-semibold text-[#E5E7EB]">{t("teamActivityTitle")}</h3><p className="mt-1 text-xs text-[#9CA3AF]">{t("teamActivitySubtitle")}</p>
      {activities.length === 0 ? <p className="py-12 text-center text-sm text-[#9CA3AF]">{t("teamActivityEmpty")}</p> : <ol className="mt-6 space-y-5">{activities.map((activity) => <li key={activity.id} className="flex gap-3"><span aria-hidden="true" className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/10 text-sm text-[#22C55E]">{activity.type === "shift_started" ? "▶" : activity.type === "timesheet_approved" ? "✓" : activity.type === "location_updated" ? "↻" : "↑"}</span><div className="min-w-0"><p className="text-sm leading-6 text-[#D1D5DB]"><strong className="font-semibold text-[#E5E7EB]">{activity.person}</strong> {activity.action}</p><p className="truncate text-xs text-[#9CA3AF]">{activity.context} · {activity.time}</p></div></li>)}</ol>}
    </section>
  );
}
