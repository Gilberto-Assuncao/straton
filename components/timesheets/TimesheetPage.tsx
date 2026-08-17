"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import EditEntryModal from "@/components/timesheets/EditEntryModal";
import TimesheetEmptyState from "@/components/timesheets/TimesheetEmptyState";
import TimesheetFilters, { type StatusFilter } from "@/components/timesheets/TimesheetFilters";
import TimesheetToolbar from "@/components/timesheets/TimesheetToolbar";
import WeeklyTimesheet from "@/components/timesheets/WeeklyTimesheet";
import WeekSummary from "@/components/timesheets/WeekSummary";
import { submitTimesheetAction } from "@/src/features/timesheets/actions";
import type { Option, Timesheet, TimesheetEntry, WeekRange, WeekSummary as WeekSummaryType } from "@/lib/types/timesheet";

type Props = { timesheet: Timesheet; employees: string[]; locations: string[]; weekRanges: WeekRange[]; taskOptions: Option[]; siteOptions: Option[] };

function ApprovalStatCards({ entries }: { entries: TimesheetEntry[] }) {
  const t = useTranslations("timesheets");
  const submitted = entries.filter((entry) => entry.status === "submitted").length;
  const approved = entries.filter((entry) => entry.status === "approved").length;
  const rejected = entries.filter((entry) => entry.status === "rejected").length;
  const cards = [
    { label: t("statAwaitingApproval"), value: submitted, color: "text-warning", border: "border-amber-400/30" },
    { label: t("statApprovedThisWeek"), value: approved, color: "text-brand-bright", border: "border-edge-10" },
    { label: t("statNeedsCorrection"), value: rejected, color: "text-danger", border: "border-danger/30" },
    { label: t("statTotalEntries"), value: entries.length, color: "text-ink", border: "border-edge-10" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-2xl border ${card.border} bg-surface p-4.5`}>
          <p className="text-xs text-ink-muted">{card.label}</p>
          <p className={`mt-2 font-mono text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function TimesheetPage({ timesheet, employees, locations, weekRanges, taskOptions, siteOptions }: Props) { const t = useTranslations("timesheets"); const [week, setWeek] = useState(timesheet.week.id); const [employee, setEmployee] = useState("all"); const [locationName, setLocationName] = useState("all"); const [status, setStatus] = useState<StatusFilter>("all"); const [search, setSearch] = useState(""); const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null); const [feedback, setFeedback] = useState(""); const closeModal = useCallback(() => setEditingEntry(null), []); const filteredEntries = useMemo(() => { const query = search.trim().toLowerCase(); if (week !== timesheet.week.id) return []; return timesheet.entries.filter((entry) => (employee === "all" || entry.employee === employee) && (locationName === "all" || entry.location === locationName) && (status === "all" || entry.status === status) && (!query || `${entry.employee} ${entry.location} ${entry.task} ${entry.notes}`.toLowerCase().includes(query))); }, [employee, locationName, search, status, timesheet, week]); const summary = useMemo<WeekSummaryType>(() => { const workedMinutes = filteredEntries.reduce((total, entry) => total + entry.workedMinutes, 0); const breakMinutes = filteredEntries.reduce((total, entry) => total + entry.breakMinutes, 0); const overtimeMinutes = filteredEntries.filter((entry) => entry.category === "overtime").reduce((total, entry) => total + Math.max(entry.workedMinutes - 480, 0), 0); return { workedMinutes, breakMinutes, overtimeMinutes, remainingMinutes: Math.max(2400 - workedMinutes, 0) }; }, [filteredEntries]); const hasFilters = week !== timesheet.week.id || employee !== "all" || locationName !== "all" || status !== "all" || search !== ""; const clear = () => { setWeek(timesheet.week.id); setEmployee("all"); setLocationName("all"); setStatus("all"); setSearch(""); }; const submit = async () => { const result = await submitTimesheetAction(); setFeedback(t(`result_${result.message}`)); }; const onSaved = (message: string) => { setEditingEntry(null); setFeedback(message); }; return <div className="grid min-w-0 gap-5"><ApprovalStatCards entries={timesheet.entries} /><TimesheetFilters weeks={weekRanges} week={week} employee={employee} locationName={locationName} status={status} search={search} employees={employees} locations={locations} onWeek={setWeek} onEmployee={setEmployee} onLocation={setLocationName} onStatus={setStatus} onSearch={setSearch} onClear={clear} hasFilters={hasFilters} /><WeekSummary summary={summary} /><TimesheetToolbar feedback={feedback} onSubmit={submit} />{filteredEntries.length ? <WeeklyTimesheet entries={filteredEntries} onEdit={setEditingEntry} /> : <TimesheetEmptyState />}{editingEntry ? <EditEntryModal entry={editingEntry}  tasks={taskOptions} sites={siteOptions} onClose={closeModal} onSaved={onSaved} /> : null}</div>; }
