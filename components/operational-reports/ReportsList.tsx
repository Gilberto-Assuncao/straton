import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { OperationalReportListItem } from "@/lib/types/operational-reports";

const statusStyles: Record<string, string> = {
  draft: "bg-white/10 text-[#9CA3AF]",
  submitted: "bg-sky-400/10 text-sky-300",
  under_review: "bg-sky-400/10 text-sky-300",
  approved: "bg-[#22C55E]/10 text-[#4ADE80]",
  rejected: "bg-red-400/10 text-red-300",
  changes_requested: "bg-amber-400/10 text-amber-300",
};

export default async function ReportsList({ reports }: { reports: OperationalReportListItem[] }) {
  const t = await getTranslations("operationalReports");
  if (reports.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/15 bg-[#161A34] p-8 text-center text-sm text-[#9CA3AF]">{t("noReports")}</div>;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#161A34]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="border-b border-white/10 bg-[#111827]/60 text-xs uppercase tracking-wide text-[#9CA3AF]">
            <tr>
              <th scope="col" className="px-5 py-4 font-medium">{t("date")}</th>
              <th scope="col" className="px-5 py-4 font-medium">{t("worker")}</th>
              <th scope="col" className="px-5 py-4 font-medium">{t("template")}</th>
              <th scope="col" className="px-5 py-4 font-medium">{t("projectSite")}</th>
              <th scope="col" className="px-5 py-4 font-medium">{t("status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-white/[0.03]">
                <td className="px-5 py-4">
                  <Link href={`/dashboard/field-reports/${report.id}`} className="font-medium text-[#E5E7EB] hover:text-[#4ADE80]">{report.reportDate}</Link>
                </td>
                <td className="px-5 py-4 text-[#E5E7EB]">{report.workerName}</td>
                <td className="px-5 py-4 text-[#9CA3AF]">{report.templateName ?? t("generic")}</td>
                <td className="px-5 py-4 text-[#9CA3AF]">{report.siteName ?? "—"}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status] ?? "bg-white/10 text-[#9CA3AF]"}`}>{t(`status_${report.status}` as "status_draft")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
