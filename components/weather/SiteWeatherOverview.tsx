import { getFormatter, getTranslations } from "next-intl/server";
import { Badge, EmptyState } from "@/src/components/data-display";
import type { SiteWeather } from "@/src/features/weather/data";
import type { AlertLevel } from "@/src/features/weather/alerts";

const alertTone = { none: "neutral", watch: "warning", "delay-risk": "danger" } as const;
// The level is a stable identifier; the label is what a person reads. Mapping
// through here keeps `delay-risk` out of the message files (#14).
const alertLabelKey = { none: "levelNone", watch: "levelWatch", "delay-risk": "levelDelayRisk" } as const satisfies Record<AlertLevel, string>;

export default async function SiteWeatherOverview({ sites }: { sites: SiteWeather[] }) {
  const [t, format] = await Promise.all([getTranslations("weather"), getFormatter()]);

  if (!sites.length) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  // Was `Intl.DateTimeFormat("en", …)`, which printed "Mon, Jul 22" to every
  // reader regardless of language. `getFormatter` carries the request locale.
  const formatDay = (date: string) =>
    format.dateTime(new Date(`${date}T00:00:00`), { weekday: "short", month: "short", day: "numeric" });

  return <div className="grid gap-5">
    {sites.map((site) => <section key={site.id} aria-labelledby={`site-${site.id}-title`} className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`site-${site.id}-title`} className="text-lg font-semibold text-ink">{site.name}</h2>
        {site.city ? <span className="text-sm text-ink-muted">{site.city}</span> : null}
      </div>

      {site.error ? <p className="mt-4 text-sm text-ink-muted">{t(site.error)}</p> : null}

      {site.forecast ? <div className="mt-4 overflow-x-auto"><div className="flex min-w-max gap-3">
        {site.forecast.map((day) => <div key={day.date} className="flex w-32 flex-col gap-2 rounded-xl bg-edge-5 p-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{formatDay(day.date)}</span>
          <span className="text-lg font-bold text-ink">{Math.round(day.temperatureMaxC)}° <span className="text-sm font-normal text-ink-muted">/ {Math.round(day.temperatureMinC)}°</span></span>
          <span className="text-xs text-ink-muted">{t("rainAndWind", { rain: Math.round(day.precipitationProbability), wind: Math.round(day.windSpeedMaxKmh) })}</span>
          <Badge tone={alertTone[day.alert.level]}>{t(alertLabelKey[day.alert.level])}</Badge>
          {day.alert.level !== "none" ? <span className="text-xs text-ink-muted">{t(day.alert.reasonKey)}</span> : null}
        </div>)}
      </div></div> : null}
    </section>)}
  </div>;
}
