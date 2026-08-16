"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import ManualEntryForm from "@/components/time/ManualEntryForm";
import RecentEntries from "@/components/time/RecentEntries";
import StaleSessionPrompt from "@/components/time/StaleSessionPrompt";
import SubdivisionSelector from "@/components/time/SubdivisionSelector";
import TaskSelector from "@/components/time/TaskSelector";
import TimerDisplay from "@/components/time/TimerDisplay";
import TodaySummary from "@/components/time/TodaySummary";
import TrackerControls from "@/components/time/TrackerControls";
import WeeklySummary from "@/components/time/WeeklySummary";
import {
  logTimeEntryAction,
  startSessionAction,
  stopSessionAction,
  type LogTimeEntryState,
} from "@/src/features/time-tracking/actions";
import type { CurrentAssignment, OpenSession, TrackerSite } from "@/src/features/time-tracking/data";
import type { DailySummary, Task, TimeEntry, WeeklySummary as WeeklySummaryType } from "@/lib/types/time";

type Props = {
  tasks: Task[];
  sites: TrackerSite[];
  /** The job the agenda says is running now, used to pre-fill the site. */
  currentAssignment: CurrentAssignment | null;
  /** The clock already running, read from the database rather than this tab (#60). */
  openSession: OpenSession | null;
  entries: TimeEntry[];
  todaySummary: DailySummary;
  weeklySummary: WeeklySummaryType;
};

export default function TimeTracker({
  tasks,
  sites,
  currentAssignment,
  openSession,
  entries,
  todaySummary,
  weeklySummary,
}: Props) {
  const t = useTranslations("time");
  const running = openSession !== null;

  /**
   * Seconds since the session started, seeded by the server.
   *
   * The server computes the first value so nothing reads the clock during
   * render — React flags that as impure, and the first paint would disagree
   * with the server's anyway. From there it simply ticks.
   */
  const baseSeconds = openSession?.elapsedSeconds ?? 0;
  const [ticks, setTicks] = useState(0);

  const [taskId, setTaskId] = useState(openSession?.taskId ?? tasks[0]?.id ?? "");
  /**
   * Pre-filled from the agenda when there is a job on now (#55).
   *
   * The whole reason the selector gets used rather than ignored. Someone on a
   * roof with gloves on is not going to scroll a list before starting work —
   * but when the schedule already says where they are, nobody has to.
   */
  const [siteId, setSiteId] = useState(openSession?.siteId ?? currentAssignment?.siteId ?? "");
  const [siteAreaId, setSiteAreaId] = useState(openSession?.siteAreaId ?? "");
  const [notes, setNotes] = useState(openSession?.notes ?? "");
  const [feedback, setFeedback] = useState("");
  const [busy, startTransition] = useTransition();
  const [manualState, submitManual] = useActionState(logTimeEntryAction, { status: "idle", message: "" } as LogTimeEntryState);

  /**
   * Re-seed when the server sends a different session, adjusting during render
   * rather than in an effect.
   *
   * React's documented way to reset state when a prop changes, and the reason
   * it is not a `useEffect` is that setting state inside one triggers a second
   * render pass — the lint rule that caught the same mistake on the agenda
   * screen. The case this handles is opening the page on a second device while
   * the clock is already running.
   */
  const seed = `${openSession?.id ?? "none"}:${baseSeconds}`;
  const [seenSeed, setSeenSeed] = useState(seed);
  if (seenSeed !== seed) {
    setSeenSeed(seed);
    setTicks(0);
  }

  const elapsedSeconds = baseSeconds + ticks;

  useEffect(() => {
    if (!running) return;
    const intervalId = window.setInterval(() => setTicks((value) => value + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [running, seed]);

  const start = () => {
    startTransition(async () => {
      const result = await startSessionAction({
        taskId,
        siteId: siteId || null,
        siteAreaId: siteAreaId || null,
        notes,
      });
      setFeedback(t(`timer_${result.message}`));
    });
  };

  const stop = (endedAt?: string) => {
    startTransition(async () => {
      const result = await stopSessionAction(endedAt ? { endedAt } : undefined);
      setFeedback(t(`timer_${result.message}`));
      if (result.ok) setNotes("");
    });
  };

  const locked = running || busy;

  return (
    <div className="grid min-w-0 gap-4">
      {openSession?.isStale ? <StaleSessionPrompt startedAt={openSession.startedAt} busy={busy} onStop={stop} /> : null}

      <section aria-labelledby="timer-title" className="overflow-hidden rounded-2xl border border-white/10 bg-surface p-5 shadow-xl shadow-black/10 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold text-brand">{t("focusTimer")}</p>
            <h3 id="timer-title" className="mt-1 text-xl font-semibold text-ink">
              {running ? t("runningSince", { time: new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(openSession.startedAt)) }) : t("timerQuestion")}
            </h3>
          </div>

          <div className="mt-8">
            <TimerDisplay seconds={elapsedSeconds} />
          </div>

          {/* The location is the question now, and the only one on the way to
              Start. Projects were the other half of this row until #77 retired
              them. */}
          <div className="mt-8">
            <TaskSelector tasks={tasks} value={taskId} onChange={setTaskId} disabled={locked} />
          </div>

          <div className="mt-4">
            <label htmlFor="tracker-site" className="mb-2 block text-sm font-medium text-ink-soft">
              {t("siteLabel")}
            </label>
            <select
              id="tracker-site"
              value={siteId}
              /*
                Changing the location clears the subdivision. Keeping it would
                leave a first floor selected against a different chantier, and
                the database refuses that pairing — a refusal at Start, for a
                field the person cannot see because the selector only shows the
                new location's subdivisions.
              */
              onChange={(event) => { setSiteId(event.target.value); setSiteAreaId(""); }}
              disabled={locked}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-surface-alt px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{t("noSite")}</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            {currentAssignment?.siteId && !running ? (
              <p className="mt-1 text-xs text-brand-bright">{t("fromAgenda", { title: currentAssignment.title })}</p>
            ) : null}
          </div>

          <div className="mt-4">
            <SubdivisionSelector
              site={sites.find((site) => site.id === siteId)}
              value={siteAreaId}
              onChange={setSiteAreaId}
              disabled={locked}
            />
          </div>

          <div className="mt-4">
            <label htmlFor="tracker-notes" className="mb-2 block text-sm font-medium text-ink-soft">
              {t("notesLabel")} <span className="text-ink-subtle">{t("optional")}</span>
            </label>
            <textarea
              id="tracker-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={locked}
              maxLength={300}
              rows={3}
              placeholder={t("notesPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-surface-alt px-3 py-3 text-sm text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-1 text-right text-xs text-ink-subtle">{notes.length}/300</p>
          </div>

          <div className="mt-6">
            <TrackerControls running={running} busy={busy} onStart={start} onStop={() => stop()} />
          </div>

          {feedback ? (
            <p aria-live="polite" className="mt-3 text-center text-sm text-brand-bright">
              {feedback}
            </p>
          ) : null}

          {/*
            The reassurance that the whole issue is about. Someone who has been
            burned by a lost day needs to be told, in words, that this one is
            not living in their browser.
          */}
          {running ? <p className="mt-2 text-center text-xs text-ink-subtle">{t("savedOnServer")}</p> : null}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <TodaySummary summary={todaySummary} />
        <WeeklySummary summary={weeklySummary} />
      </div>

      <ManualEntryForm tasks={tasks} sites={sites} feedback={manualState.message} action={submitManual} />
      <RecentEntries entries={entries} />
    </div>
  );
}
