import { getTranslations } from "next-intl/server";
import type { RecentTimesheet } from "@/lib/types/dashboard";
import StatusBadge from "./StatusBadge";

export default async function RecentTimesheets({ timesheets }: { timesheets: RecentTimesheet[] }) {
  const t = await getTranslations("dashboard");
  const columns = [t("columnEmployee"), t("columnProject"), t("columnHours"), t("columnDate"), t("columnStatus")];
  return (
    <section aria-labelledby="recent-timesheets-title" className="overflow-hidden rounded-2xl border border-white/10 bg-[#161A34]">
      <div className="p-5 sm:p-6"><h3 id="recent-timesheets-title" className="text-lg font-semibold text-[#E5E7EB]">{t("recentTimesheetsTitle")}</h3><p className="mt-1 text-xs text-[#9CA3AF]">{t("recentTimesheetsSubtitle")}</p></div>
      {timesheets.length === 0 ? <p className="border-t border-white/10 px-5 py-12 text-center text-sm text-[#9CA3AF]">{t("recentTimesheetsEmpty")}</p> : <>
        <div className="hidden md:block"><table className="w-full border-collapse text-left text-sm"><thead className="border-y border-white/10 bg-[#111827]/60 text-xs uppercase tracking-wide text-[#9CA3AF]"><tr>{columns.map((heading) => <th key={heading} scope="col" className="px-6 py-4 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-white/10">{timesheets.map((item) => <tr key={item.id} className="transition hover:bg-white/[0.03]"><th scope="row" className="px-6 py-4 font-semibold text-[#E5E7EB]">{item.employee}</th><td className="px-6 py-4 text-[#D1D5DB]">{item.location}</td><td className="px-6 py-4 text-[#D1D5DB]">{item.hours}h</td><td className="px-6 py-4 text-[#9CA3AF]">{item.date}</td><td className="px-6 py-4"><StatusBadge status={item.status} /></td></tr>)}</tbody></table></div>
        <ul className="divide-y divide-white/10 border-t border-white/10 md:hidden">{timesheets.map((item) => <li key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#E5E7EB]">{item.employee}</p><p className="mt-1 text-sm text-[#9CA3AF]">{item.location}</p></div><StatusBadge status={item.status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-[#6B7280]">{t("columnHours")}</dt><dd className="mt-1 text-[#D1D5DB]">{item.hours}h</dd></div><div><dt className="text-xs text-[#6B7280]">{t("columnDate")}</dt><dd className="mt-1 text-[#D1D5DB]">{item.date}</dd></div></dl></li>)}</ul>
      </>}
    </section>
  );
}
