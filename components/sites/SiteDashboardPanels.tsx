import { getTranslations } from "next-intl/server";
import type { SiteDashboard } from "@/src/features/sites/data";
import { share } from "@/src/features/sites/planning";
import type { SiteRecord } from "@/src/features/sites/types";
import type { SiteWeather } from "@/src/features/weather/data";

const card = "rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6";
const empty = "rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-[#6B7280]";

function hours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function time(iso: string): string {
  return iso.slice(11, 16);
}

const statusTone: Record<string, string> = {
  draft: "bg-white/10 text-[#9CA3AF]",
  submitted: "bg-amber-400/10 text-amber-300",
  under_review: "bg-amber-400/10 text-amber-300",
  approved: "bg-[#22C55E]/10 text-[#4ADE80]",
  rejected: "bg-red-400/10 text-red-300",
  changes_requested: "bg-red-400/10 text-red-300",
};

function Badge({ status, label }: { status: string; label: string }) {
  return <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${statusTone[status] ?? statusTone.draft}`}>{label}</span>;
}

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export async function OverviewPanel({ site, data }: { site: SiteRecord; data: SiteDashboard }) {
  const t = await getTranslations("sites");
  const address = [site.address.street, site.address.postal_code, site.address.city].filter(Boolean).join(", ");

  // Unchanged, but two of them mean something different now: the hours are the
  // location's whole history rather than the last 50 entries, and the pending
  // count is exact rather than however many of those 50 were awaiting review.
  // The number of subdivisions is deliberately not a fifth tile — the tab
  // already carries it, and a tile repeating a badge two centimetres away is
  // one more thing to read and nothing more to learn.
  const stats = [
    { label: t("statPresentToday"), value: String(data.presentToday.length) },
    { label: t("statHoursLogged"), value: hours(data.hours.totalMinutes) },
    { label: t("statPendingApproval"), value: String(data.hours.pendingApproval), warn: data.hours.pendingApproval > 0 },
    { label: t("statReports"), value: String(data.reports.length) },
  ];

  // Worked against planned, both in the units they were recorded in: minutes
  // are kept as minutes until they are printed, and the percentage is computed
  // from the totals rather than from the rounded hours on screen.
  const estimatedMinutes = site.estimatedHours === null ? null : Math.round(site.estimatedHours * 60);
  const hoursShare = share(data.hours.totalMinutes, estimatedMinutes);
  const budgetShare = share(site.budgetSpent, site.budgetAmount);
  const hasPlanning = site.estimatedHours !== null || site.budgetAmount !== null || Boolean(site.description);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={card}>
            <p className="text-xs text-[#9CA3AF]">{stat.label}</p>
            <p className={`mt-3 font-mono text-[28px] font-bold ${stat.warn ? "text-[#F59E0B]" : "text-[#E5E7EB]"}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className={card}>
        <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("detailsTitle")}</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-[#6B7280]">{t("nameLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{site.name}</dd></div>
          <div><dt className="text-xs text-[#6B7280]">{t("priorityLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{t(`priority_${site.priority}` as "priority_medium")}</dd></div>
          <div><dt className="text-xs text-[#6B7280]">{t("projectLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{site.projectName ?? t("noProject")}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs text-[#6B7280]">{t("streetLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{address || t("noAddress")}</dd></div>
          {site.reference ? <div><dt className="text-xs text-[#6B7280]">{t("referenceLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{site.reference}</dd></div> : null}
          {site.poNumber ? <div><dt className="text-xs text-[#6B7280]">{t("poLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{site.poNumber}</dd></div> : null}
          {site.startsAt ? <div><dt className="text-xs text-[#6B7280]">{t("startsAtLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{site.startsAt}</dd></div> : null}
          {site.endsAt ? <div><dt className="text-xs text-[#6B7280]">{t("endsAtLabel")}</dt><dd className="mt-1 text-sm text-[#D1D5DB]">{site.endsAt}</dd></div> : null}
          <div>
            {/* A confirmed/missing state, not the numbers. The pair told a site
                manager nothing they could act on; whether the weather and the
                map will work is the thing they can. */}
            <dt className="text-xs text-[#6B7280]">{t("locationTitle")}</dt>
            <dd className="mt-1 text-sm">
              {site.latitude != null && site.longitude != null ? (
                <span className="text-[#4ADE80]">{t("locationConfirmed")}</span>
              ) : (
                <span className="text-amber-300">{t("locationMissing")}</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/*
        The planning that moved here from the project (#77). Shown only when
        somebody has filled something in: a card of dashes and "0%" for a
        company that costs its jobs elsewhere is noise on the page every other
        screen links to.
      */}
      {hasPlanning ? (
        <div className={card}>
          <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("planningTitle")}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {site.estimatedHours !== null ? (
              <div>
                <dt className="text-xs text-[#6B7280]">{t("estimatedHoursLabel")}</dt>
                <dd className="mt-1 text-sm text-[#D1D5DB]">
                  {t("hoursWorkedOfEstimated", {
                    worked: hours(data.hours.totalMinutes),
                    estimated: `${site.estimatedHours}h`,
                  })}
                  {hoursShare !== null ? <span className="ml-2 text-xs text-[#9CA3AF]">{hoursShare}%</span> : null}
                </dd>
              </div>
            ) : null}
            {site.budgetAmount !== null ? (
              <div>
                <dt className="text-xs text-[#6B7280]">{t("budgetLabel")}</dt>
                <dd className="mt-1 text-sm text-[#D1D5DB]">
                  {t("budgetSpentOf", {
                    spent: money(site.budgetSpent, site.budgetCurrency),
                    total: money(site.budgetAmount, site.budgetCurrency),
                  })}
                  {budgetShare !== null ? (
                    <span className={`ml-2 text-xs ${budgetShare > 100 ? "text-red-300" : "text-[#9CA3AF]"}`}>{budgetShare}%</span>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {site.description ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-[#6B7280]">{t("descriptionLabel")}</dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-[#D1D5DB]">{site.description}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

export async function PresencePanel({ data }: { data: SiteDashboard }) {
  const t = await getTranslations("sites");
  if (data.presentToday.length === 0) return <p className={empty}>{t("presenceEmpty")}</p>;

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("tab_presence")}</h2>
      <p className="mt-1 text-sm text-[#9CA3AF]">{t("presenceSubtitle")}</p>
      <ul className="mt-5 divide-y divide-white/10">
        {data.presentToday.map((person) => (
          <li key={person.userId} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <span className="flex items-center gap-2.5 text-sm font-medium text-[#E5E7EB]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#4ADE80]" aria-hidden="true" />
              {person.name}
            </span>
            <span className="text-xs text-[#9CA3AF]">
              {/* Presence is now the clock running against this chantier, not a
                  GPS fix taken from the person's phone (#61). */}
              {t("presenceSince", { time: time(person.startedAt) })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function WeatherPanel({ weather }: { weather: SiteWeather | null }) {
  const t = await getTranslations("sites");
  if (!weather || weather.error || !weather.forecast) {
    return <p className={empty}>{weather?.error ?? t("weatherUnavailable")}</p>;
  }

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("weatherTitle")}</h2>
      <p className="mt-1 text-sm text-[#9CA3AF]">{t("weatherPanelSubtitle")}</p>
      <ul className="mt-5 grid gap-3">
        {weather.forecast.map((day) => (
          <li key={day.date} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#111C33] px-4 py-3.5">
            <span className="text-sm font-medium text-[#E5E7EB]">{day.date}</span>
            <span className="flex flex-wrap items-center gap-4 text-xs text-[#9CA3AF]">
              <span>{day.temperatureMinC}° / {day.temperatureMaxC}°</span>
              <span>{day.precipitationMm} mm</span>
              <span>{day.windSpeedMaxKmh} km/h</span>
              {day.alert.level !== "none" ? (
                <span className={`inline-flex min-h-7 items-center rounded-full px-3 font-semibold ${day.alert.level === "delay-risk" ? "bg-red-400/10 text-red-300" : "bg-amber-400/10 text-amber-300"}`}>
                  {day.alert.reason}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function HoursPanel({ data }: { data: SiteDashboard }) {
  const t = await getTranslations("sites");
  if (data.hours.entries.length === 0) return <p className={empty}>{t("hoursEmpty")}</p>;

  return (
    <div className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("tab_hours")}</h2>
        {/* The total is the location's, summed in SQL. The list below is the
            50 most recent — it used to be both, so the total was silently the
            tail of the history and still called itself the total. */}
        <p className="text-sm text-[#9CA3AF]">{t("hoursTotal", { total: hours(data.hours.totalMinutes) })}</p>
      </div>
      <p className="mt-1 text-xs text-[#6B7280]">{t("hoursRecentOnly", { count: data.hours.entries.length })}</p>

      {/*
        The breakdown the subdivisions exist for (#77), and the reason it is
        only drawn when there is more than one row: a location nobody divided
        has all its hours under a single heading, which is a list of one
        pretending to be an analysis.

        The unattributed row is shown rather than hidden — hours booked before
        the location was divided, or by somebody on the quick-clock page who was
        never asked. Dropping it would make these rows sum to less than the
        total two lines above, with nothing to explain the difference.
      */}
      {data.hours.byArea.length > 1 ? (
        <ul className="mt-5 grid gap-2 border-b border-white/10 pb-5">
          {data.hours.byArea.map((area) => (
            <li key={area.areaId ?? "unattributed"} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#111C33] px-4 py-3">
              <span className="text-sm text-[#E5E7EB]">
                {area.areaId === null
                  ? t("areaUnattributed")
                  : area.isDefault
                    ? t("areaWholeLocation")
                    : area.name}
              </span>
              <span className="flex items-center gap-4 text-xs text-[#9CA3AF]">
                <span>{t("areaPeopleCount", { count: area.peopleCount })}</span>
                <span className="font-mono text-sm text-[#D1D5DB]">{hours(area.minutes)}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="mt-5 divide-y divide-white/10">
        {data.hours.entries.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#E5E7EB]">{entry.person}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{entry.date}{entry.task ? ` · ${entry.task}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-[#D1D5DB]">{hours(entry.minutes)}</span>
              <Badge status={entry.status} label={t(`entryStatus_${entry.status}` as "entryStatus_draft")} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function ReportsPanel({ data }: { data: SiteDashboard }) {
  const t = await getTranslations("sites");
  if (data.reports.length === 0) return <p className={empty}>{t("reportsEmpty")}</p>;

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("tab_reports")}</h2>
      <ul className="mt-5 divide-y divide-white/10">
        {data.reports.map((report) => (
          <li key={report.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#E5E7EB]">{report.activity ?? t("reportNoActivity")}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{report.date} · {report.worker}</p>
            </div>
            <Badge status={report.status} label={t(`reportStatus_${report.status}` as "reportStatus_draft")} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function TeamPanel({ data }: { data: SiteDashboard }) {
  const t = await getTranslations("sites");
  if (data.team.length === 0) return <p className={empty}>{t("teamEmpty")}</p>;

  const present = new Set(data.presentToday.map((person) => person.name));

  return (
    <div className={card}>
      <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("tab_team")}</h2>
      <p className="mt-1 text-sm text-[#9CA3AF]">{t("teamSubtitle")}</p>
      <ul className="mt-5 divide-y divide-white/10">
        {data.team.map((member) => (
          <li key={member.membershipId} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#E5E7EB]">{member.name}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{[member.jobTitle, member.companyName].filter(Boolean).join(" · ")}</p>
            </div>
            {present.has(member.name) ? (
              <span className="inline-flex min-h-7 items-center rounded-full bg-[#22C55E]/10 px-3 text-xs font-semibold text-[#4ADE80]">{t("onSiteToday")}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
