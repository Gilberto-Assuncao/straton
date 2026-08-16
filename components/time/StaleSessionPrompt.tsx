"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { confirmSessionAction } from "@/src/features/time-tracking/actions";

/**
 * A clock that has been running longer than any working day (#60).
 *
 * Someone pressed Start and went home. Closing it automatically after N hours
 * would be the system inventing an answer, and leaving it running turns into
 * hours nobody worked. So it asks the one person who knows what happened.
 *
 * Deliberately not a blocker: the clock keeps running underneath. Nothing is
 * lost while the question goes unanswered, which is the opposite of the bug
 * this whole issue is about.
 */
export default function StaleSessionPrompt({
  startedAt,
  busy,
  onStop,
}: {
  startedAt: string;
  busy: boolean;
  onStop: (endedAt?: string) => void;
}) {
  const t = useTranslations("time");
  const [correcting, setCorrecting] = useState(false);
  const [endTime, setEndTime] = useState("17:00");
  const [confirming, startTransition] = useTransition();

  const started = new Date(startedAt);
  const startedLabel = new Intl.DateTimeFormat("en", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(started);

  const stopAtCorrectedTime = () => {
    // The correction is anchored to the day the session *started*, not today.
    // A clock left running overnight and fixed the next morning otherwise ends
    // before it began, and the database — rightly — refuses it.
    const [hours, minutes] = endTime.split(":").map(Number);
    const corrected = new Date(started);
    corrected.setHours(hours, minutes, 0, 0);
    onStop(corrected.toISOString());
  };

  return (
    <section aria-labelledby="stale-session-title" className="rounded-2xl border border-amber-400/40 bg-amber-400/[0.06] p-5">
      <h3 id="stale-session-title" className="text-sm font-semibold text-amber-200">
        {t("staleTitle")}
      </h3>
      <p className="mt-2 text-sm text-ink-soft">{t("staleBody", { started: startedLabel })}</p>

      {correcting ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs text-ink-muted">{t("staleFinishedAt")}</span>
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="min-h-11 rounded-lg border border-white/15 bg-surface-alt px-3 text-sm text-ink"
            />
          </label>
          <button
            type="button"
            onClick={stopAtCorrectedTime}
            disabled={busy}
            className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-50"
          >
            {t("staleSaveCorrection")}
          </button>
          <button
            type="button"
            onClick={() => setCorrecting(false)}
            className="min-h-11 rounded-lg px-3 text-sm text-ink-muted hover:text-ink"
          >
            {t("cancel")}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startTransition(async () => void (await confirmSessionAction()))}
            disabled={confirming || busy}
            className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-semibold text-ink hover:bg-white/5 disabled:opacity-50"
          >
            {t("staleStillWorking")}
          </button>
          <button
            type="button"
            onClick={() => setCorrecting(true)}
            className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand-hover"
          >
            {t("staleIFinishedEarlier")}
          </button>
        </div>
      )}
    </section>
  );
}
