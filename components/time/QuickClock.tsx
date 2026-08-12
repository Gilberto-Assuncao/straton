"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { startSessionAction, stopSessionAction } from "@/src/features/time-tracking/actions";
import type { CurrentAssignment, OpenSession, TrackerSite } from "@/src/features/time-tracking/data";
import type { Project, Task } from "@/lib/types/time";

/**
 * The clock-in page for somebody standing on a site (#31).
 *
 * The landing page promises "registre o ponto em três toques", and the three it
 * shows are press, confirmation, history — so the work itself is one tap. That
 * is the whole design constraint: everything else on this screen exists to keep
 * that tap honest, and nothing may be added that turns it into two.
 *
 * The location comes pre-filled from the agenda (#55). Someone on a roof with
 * gloves on does not scroll a list before starting work, and if the schedule
 * already says where they are, nobody has to.
 */
export default function QuickClock({
  openSession,
  currentAssignment,
  sites,
  projects,
  tasks,
  todayMinutes,
}: {
  openSession: OpenSession | null;
  currentAssignment: CurrentAssignment | null;
  sites: TrackerSite[];
  projects: Project[];
  tasks: Task[];
  todayMinutes: number;
}) {
  const t = useTranslations("quickClock");
  const running = openSession !== null;

  const [siteId, setSiteId] = useState(openSession?.siteId ?? currentAssignment?.siteId ?? "");
  const [changingSite, setChangingSite] = useState(false);
  const [busy, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const base = openSession?.elapsedSeconds ?? 0;
  const [ticks, setTicks] = useState(0);
  const seed = `${openSession?.id ?? "none"}:${base}`;
  const [seenSeed, setSeenSeed] = useState(seed);
  if (seenSeed !== seed) {
    setSeenSeed(seed);
    setTicks(0);
  }
  const elapsed = base + ticks;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTicks((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [running, seed]);

  /**
   * Asks the device where it is, and gives up quickly.
   *
   * The position is sent once and never stored — the server compares it with
   * the work location and keeps only whether they matched. A refusal or a slow
   * fix must not block the clock-in: being unable to prove the location is not
   * a reason to lose the hours.
   */
  function currentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 8_000 },
      );
    });
  }

  const clockIn = () => {
    startTransition(async () => {
      const coordinates = await currentPosition();
      const result = await startSessionAction({
        projectId: currentAssignment?.projectId ?? projects[0]?.id ?? "",
        taskId: tasks[0]?.id ?? "",
        siteId: siteId || null,
        coordinates,
      });
      setFeedback({ ok: result.ok, text: t(`timer_${result.message}`) });
    });
  };

  const clockOut = () => {
    startTransition(async () => {
      const result = await stopSessionAction();
      setFeedback({ ok: result.ok, text: t(`timer_${result.message}`) });
    });
  };

  const siteName = sites.find((site) => site.id === siteId)?.name ?? null;
  const hours = `${Math.floor(elapsed / 3600)}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#22C55E]">{t("eyebrow")}</p>
        <h1 className="mt-1 text-2xl font-bold text-[#E5E7EB]">{running ? t("runningTitle") : t("idleTitle")}</h1>
      </div>

      {/*
        The location, shown as a fact rather than as a question. It is only a
        control when it is wrong, which on most days it is not.

        No subdivision selector here, unlike the tracker and the manual form
        (#77). This screen exists to be one tap, and a second dropdown is
        exactly what turns it into two. An undivided location is filled in by
        the database anyway; a divided one leaves these hours unattributed,
        which the report shows as the honest gap it is. Somebody who needs to
        say which floor has the full tracker to say it on.
      */}
      <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5 text-center">
        <p className="text-xs text-[#9CA3AF]">{t("whereLabel")}</p>
        <p className="mt-1 text-lg font-semibold text-[#E5E7EB]">{siteName ?? t("noSite")}</p>

        {changingSite ? (
          <select
            aria-label={t("whereLabel")}
            value={siteId}
            onChange={(event) => {
              setSiteId(event.target.value);
              setChangingSite(false);
            }}
            className="mt-3 min-h-12 w-full rounded-xl border border-white/15 bg-[#111827] px-3 text-base text-[#E5E7EB]"
          >
            <option value="">{t("noSite")}</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        ) : running ? null : (
          <button
            type="button"
            onClick={() => setChangingSite(true)}
            className="mt-2 min-h-11 text-sm font-semibold text-[#4ADE80] underline-offset-4 hover:underline"
          >
            {t("changeSite")}
          </button>
        )}
      </div>

      {running ? (
        <p className="text-center font-mono text-5xl font-bold tabular-nums text-[#4ADE80]">{hours}</p>
      ) : todayMinutes > 0 ? (
        <p className="text-center text-sm text-[#9CA3AF]">
          {t("todaySoFar", { hours: `${Math.floor(todayMinutes / 60)}h${String(todayMinutes % 60).padStart(2, "0")}` })}
        </p>
      ) : null}

      {/*
        One target, thumb-sized, and the only thing on the screen that acts.
        A second button beside it is how a one-tap flow becomes a decision.
      */}
      <button
        type="button"
        onClick={running ? clockOut : clockIn}
        disabled={busy}
        className={`min-h-20 w-full rounded-2xl text-xl font-bold transition disabled:opacity-60 ${
          running
            ? "border-2 border-red-400/40 bg-red-400/10 text-red-200"
            : "bg-[#22C55E] text-[#07110B] hover:bg-[#16A34A]"
        }`}
      >
        {busy ? t("working") : running ? t("clockOut") : t("clockIn")}
      </button>

      {feedback ? (
        <p role="status" className={`text-center text-sm ${feedback.ok ? "text-[#4ADE80]" : "text-amber-300"}`}>
          {feedback.text}
        </p>
      ) : null}

      <p className="text-center text-xs leading-5 text-[#6B7280]">{t("locationNotice")}</p>
    </main>
  );
}
