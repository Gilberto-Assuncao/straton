"use client";

import { useTranslations } from "next-intl";
import type { WeekRange } from "@/lib/types/timesheet";

export default function WeekSelector({ weeks, value, onChange }: { weeks: WeekRange[]; value: string; onChange: (value: string) => void }) { const t = useTranslations("timesheets"); return <div><label htmlFor="timesheet-week" className="text-xs font-medium text-ink-muted">{t("week")}</label><select id="timesheet-week" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-edge-10 bg-surface px-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20">{weeks.map((week) => <option key={week.id} value={week.id}>{week.label}</option>)}</select></div>; }
