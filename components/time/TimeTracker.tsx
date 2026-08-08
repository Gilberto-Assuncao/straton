"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import CurrentSessionCard from "@/components/time/CurrentSessionCard";
import ManualEntryForm from "@/components/time/ManualEntryForm";
import ProjectSelector from "@/components/time/ProjectSelector";
import RecentEntries from "@/components/time/RecentEntries";
import TaskSelector from "@/components/time/TaskSelector";
import TimerDisplay from "@/components/time/TimerDisplay";
import TodaySummary from "@/components/time/TodaySummary";
import TrackerControls from "@/components/time/TrackerControls";
import WeeklySummary from "@/components/time/WeeklySummary";
import { logTimeEntryAction, logTimerSessionAction, type LogTimeEntryState } from "@/src/features/time-tracking/actions";
import type { CurrentAssignment, TrackerSite } from "@/src/features/time-tracking/data";
import type { DailySummary, Project, RunningSession, Task, TimeEntry, TimerState, WeeklySummary as WeeklySummaryType } from "@/lib/types/time";

type Props = {
  projects: Project[]; tasks: Task[];
  sites: TrackerSite[];
  /** The job the agenda says is running now, used to pre-fill the site. */
  currentAssignment: CurrentAssignment | null;
  entries: TimeEntry[]; todaySummary: DailySummary; weeklySummary: WeeklySummaryType; locationConsent: boolean;
};
export default function TimeTracker({ projects, tasks, sites, currentAssignment, entries, todaySummary, weeklySummary, locationConsent }: Props) {
  const t = useTranslations("time");
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [projectId, setProjectId] = useState(currentAssignment?.projectId ?? projects[0]?.id ?? "");
  /**
   * Pre-filled from the agenda when there is a job on now (#55).
   *
   * The whole reason the selector gets used rather than ignored. Someone on a
   * roof with gloves on is not going to scroll a list before starting work — but
   * when the schedule already says where they are, nobody has to.
   */
  const [siteId, setSiteId] = useState(currentAssignment?.siteId ?? "");
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [manualState, submitManual] = useActionState(logTimeEntryAction, { status: "idle", message: "" } as LogTimeEntryState);
  const [stopFeedback, setStopFeedback] = useState("");

  useEffect(() => {
    if (timerState !== "running") return;
    const intervalId = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [timerState]);

  const selectedProject = projects.find((project) => project.id === projectId) ?? projects[0];
  const selectedTask = tasks.find((task) => task.id === taskId) ?? tasks[0];
  const session = useMemo<RunningSession | null>(() => selectedProject && selectedTask && timerState !== "idle" ? { project: selectedProject, task: selectedTask, startedAt, elapsedSeconds, notes } : null, [elapsedSeconds, notes, selectedProject, selectedTask, startedAt, timerState]);

  const [startedAtIso, setStartedAtIso] = useState("");

  const start = () => {
    setElapsedSeconds(0);
    const now = new Date();
    setStartedAtIso(now.toISOString());
    setStartedAt(new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(now));
    setTimerState("running");
    setCoords(null);
    if (locationConsent && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => setCoords(null),
        { maximumAge: 60_000, timeout: 8_000 },
      );
    }
  };
  const stop = () => {
    setTimerState("idle");
    setElapsedSeconds(0);
    setStopFeedback(t("savingSession"));
    logTimerSessionAction({ projectId, taskId, siteId: siteId || null, startedAt: startedAtIso, notes, latitude: coords?.latitude, longitude: coords?.longitude })
      .then((result) => setStopFeedback(result.message))
      .catch(() => setStopFeedback(t("unableToSaveSession")));
    setStartedAt("");
    setStartedAtIso("");
    setNotes("");
    setCoords(null);
  };

  return <div className="grid min-w-0 gap-4"><section aria-labelledby="timer-title" className="overflow-hidden rounded-2xl border border-white/10 bg-[#161A34] p-5 shadow-xl shadow-black/10 sm:p-8"><div className="mx-auto max-w-3xl"><div className="text-center"><p className="text-sm font-semibold text-[#22C55E]">{t("focusTimer")}</p><h3 id="timer-title" className="mt-1 text-xl font-semibold text-[#E5E7EB]">{t("timerQuestion")}</h3></div><div className="mt-8"><TimerDisplay seconds={elapsedSeconds} /></div><div className="mt-8 grid gap-4 sm:grid-cols-2"><ProjectSelector projects={projects} value={projectId} onChange={setProjectId} disabled={timerState !== "idle"} /><TaskSelector tasks={tasks} value={taskId} onChange={setTaskId} disabled={timerState !== "idle"} /></div><div className="mt-4"><label htmlFor="tracker-site" className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("siteLabel")}</label><select id="tracker-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} disabled={timerState !== "idle"} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{t("noSite")}</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>{currentAssignment?.siteId ? <p className="mt-1 text-xs text-[#4ADE80]">{t("fromAgenda", { title: currentAssignment.title })}</p> : null}</div><div className="mt-4"><label htmlFor="tracker-notes" className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("notesLabel")} <span className="text-[#6B7280]">{t("optional")}</span></label><textarea id="tracker-notes" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={timerState !== "idle"} maxLength={300} rows={3} placeholder={t("notesPlaceholder")} className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-3 text-sm text-[#E5E7EB] outline-none transition placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 disabled:cursor-not-allowed disabled:opacity-60" /><p className="mt-1 text-right text-xs text-[#6B7280]">{notes.length}/300</p></div><div className="mt-6"><TrackerControls state={timerState} onStart={start} onPause={() => setTimerState("paused")} onResume={() => setTimerState("running")} onStop={stop} /></div>{stopFeedback ? <p aria-live="polite" className="mt-3 text-center text-sm text-[#4ADE80]">{stopFeedback}</p> : null}</div></section>{session ? <CurrentSessionCard session={session} /> : null}<div className="grid gap-4 xl:grid-cols-2"><TodaySummary summary={todaySummary} /><WeeklySummary summary={weeklySummary} /></div><ManualEntryForm projects={projects} tasks={tasks} sites={sites} feedback={manualState.message} action={submitManual} /><RecentEntries entries={entries} /></div>;
}
