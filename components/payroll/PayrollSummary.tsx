"use client";

import { useTranslations } from "next-intl";
import type { PayrollPeriodSummary } from "@/src/features/payroll/data";

function hours(minutes: number) { return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim(); }

export default function PayrollSummary({ summary }: { summary: PayrollPeriodSummary }) {
  const t = useTranslations("payroll");
  const cards = [
    { label: t("statApprovedHours"), value: hours(summary.totalMinutes), color: "text-[#E5E7EB]", border: "border-white/10" },
    { label: t("statNightHours"), value: hours(summary.nightMinutes), color: "text-[#4ADE80]", border: "border-white/10" },
    { label: t("statWeekendHours"), value: hours(summary.weekendMinutes), color: "text-[#F59E0B]", border: "border-amber-400/30" },
  ];

  return (
    <div className="grid min-w-0 gap-5">
      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4 text-sm text-[#E5E7EB]">
        <p className="font-semibold text-[#F59E0B]">{t("previewNoticeTitle")}</p>
        <p className="mt-1 text-[#9CA3AF]">{t("previewNoticeBody")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className={`rounded-2xl border ${card.border} bg-[#161A34] p-4.5`}>
            <p className="text-xs text-[#9CA3AF]">{card.label}</p>
            <p className={`mt-2 font-mono text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#161A34]">
        <div className="border-b border-white/5 p-4.5 text-sm font-bold text-[#E5E7EB]">{t("tableTitle")}</div>
        {summary.employees.length ? (
          <div className="divide-y divide-white/5">
            <div className="grid grid-cols-4 gap-2 px-4.5 py-3 text-[11px] uppercase tracking-wide text-[#64748B]">
              <span>{t("colEmployee")}</span>
              <span>{t("colRegular")}</span>
              <span>{t("colNight")}</span>
              <span>{t("colTotal")}</span>
            </div>
            {summary.employees.map((employee) => (
              <div key={employee.employee} className="grid grid-cols-4 gap-2 px-4.5 py-3 text-sm">
                <span className="font-semibold text-[#E5E7EB]">{employee.employee}</span>
                <span className="font-mono text-[#9CA3AF]">{hours(employee.regularMinutes)}</span>
                <span className="font-mono text-[#9CA3AF]">{hours(employee.nightMinutes)}</span>
                <span className="font-mono font-semibold text-[#E5E7EB]">{hours(employee.totalMinutes)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4.5 text-sm text-[#9CA3AF]">{t("emptyState")}</p>
        )}
      </div>
    </div>
  );
}
