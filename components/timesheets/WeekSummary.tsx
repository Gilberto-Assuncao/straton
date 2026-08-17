"use client";

import { useTranslations } from "next-intl";
import type { WeekSummary as WeekSummaryType } from "@/lib/types/timesheet";

function hours(minutes: number) { return `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ""}`.trim(); }
export default function WeekSummary({ summary }: { summary: WeekSummaryType }) {
  const t = useTranslations("timesheets");
  const cards = [{ label: t("hoursWorked"), value: hours(summary.workedMinutes), tone: "text-brand-bright" }, { label: t("breakTime"), value: hours(summary.breakMinutes), tone: "text-ink" }, { label: t("overtime"), value: hours(summary.overtimeMinutes), tone: "text-warning-soft" }, { label: t("remainingHours"), value: hours(summary.remainingMinutes), tone: "text-ink" }];
  return <section aria-label={t("weekSummaryAriaLabel")} className="grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-2xl border border-edge-10 bg-surface p-4 sm:p-5"><p className="text-xs text-ink-muted">{card.label}</p><p className={`mt-2 text-xl font-bold sm:text-2xl ${card.tone}`}>{card.value}</p></div>)}</section>;
}
