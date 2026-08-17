import { getTranslations } from "next-intl/server";
import type { WeeklyHoursEntry } from "@/lib/types/dashboard";

export default async function WeeklyHoursChart({ data }: { data: WeeklyHoursEntry[] }) {
  const t = await getTranslations("dashboard");
  const max = Math.max(...data.map((item) => item.hours), 1);
  return (
    <section aria-labelledby="weekly-hours-title" className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4"><div><h3 id="weekly-hours-title" className="text-lg font-semibold text-ink">{t("weeklyHoursTitle")}</h3><p className="mt-1 text-xs text-ink-muted">{t("weeklyHoursSubtitle")}</p></div><div className="flex items-center gap-2 text-xs text-ink-muted"><span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />{t("weeklyHoursLegend")}</div></div>
      {data.length === 0 ? <p className="mt-12 text-center text-sm text-ink-muted">{t("weeklyHoursEmpty")}</p> : <>
        <div role="img" aria-label={t("weeklyHoursAria")} className="mt-8 flex h-56 items-end justify-between gap-2 border-b border-edge-10 pb-3 sm:gap-4">
          {data.map((item) => <div key={item.day} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center"><span className="mb-2 text-xs font-semibold text-ink-soft">{item.hours}h</span><div className="mx-auto w-full max-w-12 rounded-t-lg bg-gradient-to-t from-brand-hover to-brand transition-opacity hover:opacity-80" style={{ height: `${Math.max((item.hours / max) * 100, 4)}%` }} /><span className="mt-3 text-xs text-ink-muted">{item.day}</span></div>)}
        </div>
        <ul className="sr-only">{data.map((item) => <li key={item.fullDay}>{t("weeklyHoursSrItem", { day: item.fullDay, hours: item.hours })}</li>)}</ul>
      </>}
    </section>
  );
}
