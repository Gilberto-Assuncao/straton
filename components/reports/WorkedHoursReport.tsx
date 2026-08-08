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

export default async function WorkedHoursReport({ report }: { report: Report }) {
  const t = await getTranslations("reports");
  const months = recentMonths(report.month);
  const pendingMinutes = report.totals.submittedMinutes + report.totals.draftMinutes;

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
                    href={`/dashboard/reports?month=${month}`}
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
              href={`/api/reports/worked-hours?month=${report.month}`}
              className="flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
            >
              {t("exportCsv")}
            </a>
          </div>
        </div>

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
                    <td className={`${cell} font-medium text-[#E5E7EB]`}>{site.siteName}</td>
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
