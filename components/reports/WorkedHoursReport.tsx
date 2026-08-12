import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatMinutes, type WorkedHoursReport as Report } from "@/src/features/reports/worked-hours";

const card = "rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6";
const cell = "px-3 py-3 text-sm";

/** The twelve months ending with the one being shown, newest first. */
function recentMonths(current: string): string[] {
  const [year, month] = current.split("-").map(Number);
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, month - 1 - index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });
}

export interface LocationOption {
  id: string;
  name: string;
}

/**
 * The URL for the report with one work location toggled on or off (#77).
 *
 * Every filter state is a real address. A manager can send "these two sites,
 * last month" to the accountant as a link and it opens showing exactly that —
 * which is the whole reason the selection is not component state.
 */
function toggleLocationHref(report: Report, locationId: string | null): string {
  const next =
    locationId === null
      ? []
      : report.siteIds.includes(locationId)
        ? report.siteIds.filter((id) => id !== locationId)
        : [...report.siteIds, locationId];

  const params = new URLSearchParams({ month: report.month });
  if (next.length) params.set("sites", next.join(","));
  return `/dashboard/reports?${params.toString()}`;
}

export default async function WorkedHoursReport({
  report,
  locations = [],
}: {
  report: Report;
  locations?: LocationOption[];
}) {
  const t = await getTranslations("reports");
  const months = recentMonths(report.month);
  const pendingMinutes = report.totals.submittedMinutes + report.totals.draftMinutes;
  const filtering = report.siteIds.length > 0;
  const csvHref = `/api/reports/worked-hours?month=${report.month}${filtering ? `&sites=${report.siteIds.join(",")}` : ""}`;

  /*
   * Does any single location in this report have more than one subdivision to
   * show? Counted per location rather than over the whole list, because eleven
   * undivided chantiers produce eleven rows and not one of them says anything
   * the locations table does not already say.
   */
  const rowsPerSite = new Map<string, number>();
  for (const area of report.areas) rowsPerSite.set(area.siteId, (rowsPerSite.get(area.siteId) ?? 0) + 1);
  const hasDividedLocation = [...rowsPerSite.values()].some((count) => count > 1);

  return (
    <section aria-labelledby="worked-hours-heading" className="grid gap-5">
      <div className={card}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="worked-hours-heading" className="text-lg font-semibold text-[#E5E7EB]">
              {t("workedHoursTitle")}
            </h2>
            <p className="mt-1 text-sm text-[#9CA3AF]">{t("workedHoursSubtitle")}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {/*
              Links rather than a form: the month belongs in the URL so a
              supervisor can bookmark last month's figures or send them to the
              accountant, and reloading shows the same numbers.
            */}
            <label className="grid gap-1.5">
              <span className="text-xs text-[#9CA3AF]">{t("monthLabel")}</span>
              <div className="flex flex-wrap gap-1">
                {months.slice(0, 4).map((month) => (
                  <Link
                    key={month}
                    // Carries the location filter across. Without this, changing
                    // month silently widens the report back to every location
                    // while the page still looks like the filtered one.
                    href={`/dashboard/reports?month=${month}${filtering ? `&sites=${report.siteIds.join(",")}` : ""}`}
                    aria-current={month === report.month ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold ${
                      month === report.month
                        ? "bg-[#22C55E]/15 text-[#4ADE80]"
                        : "border border-white/15 text-[#9CA3AF] hover:bg-white/5"
                    }`}
                  >
                    {month}
                  </Link>
                ))}
              </div>
            </label>
            <a
              href={csvHref}
              className="flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
            >
              {t("exportCsv")}
            </a>
          </div>
        </div>

        {/*
          The work locations the figures cover (#77). "Todos" is a link like the
          rest rather than a checkbox, so clearing the filter is one click and
          not "untick each of the eleven".

          Hidden entirely for a company with a single location: a filter that
          can only ever say "all" or "the one" is a control that does nothing.
        */}
        {locations.length > 1 ? (
          <fieldset className="mt-5 border-0 p-0">
            <legend className="text-xs text-[#9CA3AF]">{t("locationsLabel")}</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Link
                href={toggleLocationHref(report, null)}
                aria-current={filtering ? undefined : "page"}
                className={`flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold ${
                  filtering
                    ? "border border-white/15 text-[#9CA3AF] hover:bg-white/5"
                    : "bg-[#22C55E]/15 text-[#4ADE80]"
                }`}
              >
                {t("allLocations")}
              </Link>
              {locations.map((location) => {
                const selected = report.siteIds.includes(location.id);
                return (
                  <Link
                    key={location.id}
                    href={toggleLocationHref(report, location.id)}
                    aria-pressed={selected}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold ${
                      selected
                        ? "bg-[#22C55E]/15 text-[#4ADE80]"
                        : "border border-white/15 text-[#9CA3AF] hover:bg-white/5"
                    }`}
                  >
                    {location.name}
                  </Link>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {/*
          Said out loud, next to the numbers, whenever the report is narrowed.
          A total that covers three of eleven locations looks exactly like a
          total that covers everything — and this one gets copied onto an
          invoice.
        */}
        {filtering ? (
          <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-200">
            {t("filteredNotice", { count: report.siteIds.length })}
          </p>
        ) : null}

        {/*
          Approved first and on its own, because it is the only figure that may
          go to a payroll office. The pending total sits beside it labelled as
          what it is — a single combined number would read like an answer to a
          question nobody asked.
        */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/[0.06] p-4">
            <p className="text-xs text-[#9CA3AF]">{t("approved")}</p>
            <p className="mt-2 font-mono text-[28px] font-bold text-[#4ADE80]">{formatMinutes(report.totals.approvedMinutes)}</p>
            <p className="mt-1 text-xs text-[#6B7280]">{t("approvedHint")}</p>
          </div>
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-4">
            <p className="text-xs text-[#9CA3AF]">
              {t("submitted")} · {t("draft")}
            </p>
            <p className="mt-2 font-mono text-[28px] font-bold text-amber-300">{formatMinutes(pendingMinutes)}</p>
            <p className="mt-1 text-xs text-[#6B7280]">{t("pendingHint")}</p>
          </div>
        </div>
      </div>

      <div className={card}>
        {report.people.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#6B7280]">{t("noData")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[#6B7280]">
                  <th className={cell}>{t("colPerson")}</th>
                  <th className={cell}>{t("colJobTitle")}</th>
                  <th className={`${cell} text-right`}>{t("approved")}</th>
                  <th className={`${cell} text-right`}>{t("submitted")}</th>
                  <th className={`${cell} text-right`}>{t("draft")}</th>
                  <th className={`${cell} text-right`}>{t("colEntries")}</th>
                </tr>
              </thead>
              <tbody>
                {report.people.map((person) => (
                  <tr key={person.membershipId} className="border-b border-white/5">
                    <td className={`${cell} font-medium text-[#E5E7EB]`}>{person.name}</td>
                    <td className={`${cell} text-[#9CA3AF]`}>{person.jobTitle ?? "—"}</td>
                    <td className={`${cell} text-right font-mono text-[#4ADE80]`}>{formatMinutes(person.approvedMinutes)}</td>
                    <td className={`${cell} text-right font-mono text-amber-300`}>
                      {person.submittedMinutes ? formatMinutes(person.submittedMinutes) : "—"}
                    </td>
                    <td className={`${cell} text-right font-mono text-[#6B7280]`}>
                      {person.draftMinutes ? formatMinutes(person.draftMinutes) : "—"}
                    </td>
                    <td className={`${cell} text-right font-mono text-[#9CA3AF]`}>{person.entryCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/15 text-sm font-semibold">
                  <td className={cell}>{t("colTotal")}</td>
                  <td className={cell} />
                  <td className={`${cell} text-right font-mono text-[#4ADE80]`}>{formatMinutes(report.totals.approvedMinutes)}</td>
                  <td className={`${cell} text-right font-mono text-amber-300`}>{formatMinutes(report.totals.submittedMinutes)}</td>
                  <td className={`${cell} text-right font-mono text-[#6B7280]`}>{formatMinutes(report.totals.draftMinutes)}</td>
                  <td className={cell} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/*
        Where the time went inside each chantier (#77).

        Drawn only when some location in this report actually has more than one
        subdivision. A company that never divided a location would otherwise get
        a second table with one row per location — the same rows as the table
        above, relabelled, which reads like a breakdown and contains no more
        information than the thing it sits under.
      */}
      {hasDividedLocation ? (
        <div className={card}>
          <h3 className="text-sm font-semibold text-[#E5E7EB]">{t("areasTitle")}</h3>
          <p className="mt-1 text-xs text-[#6B7280]">{t("areasSubtitle")}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[#6B7280]">
                  <th className={cell}>{t("colSite")}</th>
                  <th className={cell}>{t("colArea")}</th>
                  <th className={`${cell} text-right`}>{t("approved")}</th>
                  <th className={`${cell} text-right`}>{t("colPending")}</th>
                  <th className={`${cell} text-right`}>{t("colPeople")}</th>
                </tr>
              </thead>
              <tbody>
                {report.areas.map((area) => (
                  <tr key={`${area.siteId}:${area.areaId ?? "none"}`} className="border-b border-white/5">
                    <td className={`${cell} text-[#9CA3AF]`}>{area.siteName}</td>
                    {/* Unattributed in amber, like the location table's "no
                        chantier" row: it is a gap to be closed, not a place. */}
                    <td className={`${cell} font-medium ${area.areaId ? "text-[#E5E7EB]" : "text-amber-300"}`}>
                      {area.areaId === null
                        ? t("noAreaRow")
                        : area.isDefault
                          ? t("areaWholeLocation")
                          : area.areaName}
                    </td>
                    <td className={`${cell} text-right font-mono text-[#4ADE80]`}>{formatMinutes(area.approvedMinutes)}</td>
                    <td className={`${cell} text-right font-mono text-amber-300`}>
                      {area.pendingMinutes ? formatMinutes(area.pendingMinutes) : "—"}
                    </td>
                    <td className={`${cell} text-right font-mono text-[#9CA3AF]`}>{area.peopleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {report.sites.length > 0 ? (
        <div className={card}>
          <h3 className="text-sm font-semibold text-[#E5E7EB]">{t("sitesTitle")}</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[#6B7280]">
                  <th className={cell}>{t("colSite")}</th>
                  <th className={cell}>{t("colProject")}</th>
                  <th className={`${cell} text-right`}>{t("approved")}</th>
                  <th className={`${cell} text-right`}>{t("colPending")}</th>
                  <th className={`${cell} text-right`}>{t("colPeople")}</th>
                </tr>
              </thead>
              <tbody>
                {report.sites.map((site) => (
                  <tr key={site.siteId} className="border-b border-white/5">
                    <td className={`${cell} font-medium ${site.siteId ? "text-[#E5E7EB]" : "text-amber-300"}`}>{site.siteName ?? t("noSiteRow")}</td>
                    <td className={`${cell} text-[#9CA3AF]`}>{site.projectName ?? "—"}</td>
                    <td className={`${cell} text-right font-mono text-[#4ADE80]`}>{formatMinutes(site.approvedMinutes)}</td>
                    <td className={`${cell} text-right font-mono text-amber-300`}>
                      {site.pendingMinutes ? formatMinutes(site.pendingMinutes) : "—"}
                    </td>
                    <td className={`${cell} text-right font-mono text-[#9CA3AF]`}>{site.peopleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
