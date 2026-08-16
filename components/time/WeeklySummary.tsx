"use client";

import { useTranslations } from "next-intl";
import type { WeeklySummary as WeeklySummaryType } from "@/lib/types/time";

export default function WeeklySummary({ summary }: { summary: WeeklySummaryType }) {
  const t = useTranslations("time");
  const progress = Math.min((summary.workedMinutes / summary.targetMinutes) * 100, 100);
  return <section aria-labelledby="week-title" className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 id="week-title" className="text-lg font-semibold text-ink">{t("thisWeek")}</h3><p className="mt-1 text-sm text-ink-muted">{t("weeklyGoalProgress")}</p></div><p className="text-right text-sm text-ink-muted"><strong className="block text-2xl text-ink">{summary.workedMinutes / 60}h</strong>{t("of")} {summary.targetMinutes / 60}h</p></div><div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={t("weeklyGoalProgress")} aria-valuemin={0} aria-valuemax={summary.targetMinutes} aria-valuenow={summary.workedMinutes}><div className="h-full rounded-full bg-gradient-to-r from-brand-hover to-brand" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs text-ink-muted">{t("percentComplete", { percent: Math.round(progress) })}</p></section>;
}
