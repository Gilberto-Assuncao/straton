"use client";

import { useTranslations } from "next-intl";

/**
 * Start and Stop. Pause is gone, and deliberately (#60).
 *
 * It never did anything. The saved duration was always computed from the start
 * time to the moment Stop was pressed, so a pause reduced the number on screen
 * and not one minute of what was recorded. Someone taking a two-hour break and
 * pausing for it was still billing those two hours — the display told them
 * otherwise, which is worse than having no button at all.
 *
 * A real pause would have to be a second pair of timestamps. Worth doing if
 * breaks need tracking; worth not faking in the meantime.
 */
type Props = { running: boolean; busy: boolean; onStart: () => void; onStop: () => void };

const primary =
  "min-h-11 flex-1 rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright disabled:opacity-50";
const secondary =
  "min-h-11 flex-1 rounded-xl border border-edge-15 bg-edge-5 px-5 text-sm font-semibold text-ink transition hover:bg-edge-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright disabled:opacity-50";

export default function TrackerControls({ running, busy, onStart, onStop }: Props) {
  const t = useTranslations("time");
  return (
    <div className="flex flex-col gap-3 min-[380px]:flex-row">
      {running ? (
        <button type="button" onClick={onStop} disabled={busy} className={secondary}>
          {t("stop")}
        </button>
      ) : (
        <button type="button" onClick={onStart} disabled={busy} className={primary}>
          {t("start")}
        </button>
      )}
    </div>
  );
}
