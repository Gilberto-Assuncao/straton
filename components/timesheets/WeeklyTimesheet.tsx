"use client";

import { useTranslations } from "next-intl";
import DailyTimesheet from "@/components/timesheets/DailyTimesheet";
import TimesheetTable from "@/components/timesheets/TimesheetTable";
import type { TimesheetEntry } from "@/lib/types/timesheet";

export default function WeeklyTimesheet({ entries, onEdit }: { entries: TimesheetEntry[]; onEdit: (entry: TimesheetEntry) => void }) { const t = useTranslations("timesheets"); return <section aria-labelledby="weekly-timesheet-title"><div className="mb-4"><h3 id="weekly-timesheet-title" className="text-lg font-semibold text-ink">{t("weeklyTimesheetTitle")}</h3><p className="mt-1 text-xs text-ink-muted">{entries.length} {entries.length === 1 ? t("entrySingular") : t("entryPlural")} {t("entriesInView")}</p></div><TimesheetTable entries={entries} onEdit={onEdit} /><DailyTimesheet entries={entries} onEdit={onEdit} /></section>; }
