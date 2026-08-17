"use client";

import { useTranslations } from "next-intl";
import type { DaySummary as DaySummaryType } from "@/lib/types/timesheet";

export default function DaySummary({ summary }: { summary: DaySummaryType }) { const t = useTranslations("timesheets"); return <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-edge-10 bg-white/[0.03] px-4 py-3 text-xs text-ink-muted"><strong className="text-sm text-ink">{summary.date}</strong><span>{Math.floor(summary.workedMinutes / 60)}h {summary.workedMinutes % 60}m {t("daySummaryWorked")}</span><span>{summary.breakMinutes}m {t("daySummaryBreak")}</span><span>{summary.entries} {summary.entries === 1 ? t("entrySingular") : t("entryPlural")}</span></div>; }
