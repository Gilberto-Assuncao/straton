"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { reviewTimesheetsAction, type TimesheetReviewOutcome } from "@/src/features/timesheets/actions";
import type { PendingTimesheet } from "@/src/features/timesheets/data";

/**
 * The weeks waiting for a decision, reviewable together (#57).
 *
 * Closing a month used to mean filtering the table down to one person, twenty
 * times. This is the same authority in one gesture.
 */
export default function ApprovalQueue({ pending, canReview }: { pending: PendingTimesheet[]; canReview: boolean }) {
  const t = useTranslations("timesheets");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<TimesheetReviewOutcome[]>([]);
  const [busy, startTransition] = useTransition();

  // A manager's own week is in the queue — someone else has to sign it off —
  // but it can never be part of their own batch, so it is not selectable.
  const selectable = useMemo(() => pending.filter((sheet) => !sheet.isMine), [pending]);
  const allSelected = selectable.length > 0 && selectable.every((sheet) => selected.has(sheet.timesheetId));

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectable.map((sheet) => sheet.timesheetId)));
  };

  const review = (decision: "approved" | "rejected") => {
    const ids = [...selected];
    if (!ids.length) return;
    startTransition(async () => {
      const result = await reviewTimesheetsAction(ids, decision);
      // Only the refusals stay on screen. The successes vanish from the queue
      // on the next render, which is a clearer confirmation than a count.
      setOutcomes(result.outcomes.filter((outcome) => !outcome.ok));
      setSelected(new Set());
    });
  };

  if (!pending.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5">
        <h3 className="text-sm font-semibold text-[#E5E7EB]">{t("queueTitle")}</h3>
        <p className="mt-2 text-sm text-[#6B7280]">{t("queueEmpty")}</p>
      </div>
    );
  }

  const totalMinutes = pending.reduce((sum, sheet) => sum + sheet.workedMinutes, 0);
  const hours = `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 ? String(totalMinutes % 60).padStart(2, "0") : ""}`;

  return (
    <section aria-labelledby="approval-queue-heading" className="rounded-2xl border border-amber-400/25 bg-[#161A34] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id="approval-queue-heading" className="text-sm font-semibold text-[#E5E7EB]">
          {t("queueTitle")}
        </h3>
        {/* The number that explains a short report: hours worked, not yet counted. */}
        <p className="text-xs text-[#9CA3AF]">{t("queueWaiting", { count: pending.length, hours })}</p>
      </div>

      {canReview ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={!selectable.length}
            className="min-h-11 rounded-lg border border-white/15 px-3 text-xs font-semibold text-[#E5E7EB] hover:bg-white/5 disabled:opacity-40"
          >
            {allSelected ? t("queueSelectNone") : t("queueSelectAll")}
          </button>
          <button
            type="button"
            onClick={() => review("approved")}
            disabled={busy || !selected.size}
            className="min-h-11 rounded-lg bg-[#22C55E] px-4 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] disabled:opacity-40"
          >
            {t("queueApproveSelected", { count: selected.size })}
          </button>
          <button
            type="button"
            onClick={() => review("rejected")}
            disabled={busy || !selected.size}
            className="min-h-11 rounded-lg border border-red-400/30 px-4 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-40"
          >
            {t("queueRejectSelected", { count: selected.size })}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-[#9CA3AF]">{t("queueReadOnly")}</p>
      )}

      <ul className="mt-4 grid gap-2">
        {pending.map((sheet) => {
          const failure = outcomes.find((outcome) => outcome.timesheetId === sheet.timesheetId);
          const sheetHours = `${Math.floor(sheet.workedMinutes / 60)}h${sheet.workedMinutes % 60 ? String(sheet.workedMinutes % 60).padStart(2, "0") : ""}`;
          return (
            <li key={sheet.timesheetId} className="rounded-xl border border-white/10 px-3 py-3">
              <label className="flex flex-wrap items-center gap-3">
                <input
                  type="checkbox"
                  className="size-4 accent-[#22C55E]"
                  checked={selected.has(sheet.timesheetId)}
                  onChange={() => toggle(sheet.timesheetId)}
                  disabled={!canReview || sheet.isMine || busy}
                />
                <span className="min-w-40 text-sm font-medium text-[#E5E7EB]">{sheet.employee}</span>
                <span className="text-xs text-[#9CA3AF]">{sheet.label}</span>
                <span className="font-mono text-sm text-amber-300">{sheetHours}</span>
                <span className="text-xs text-[#6B7280]">{t("queueEntries", { count: sheet.entryCount })}</span>
                {sheet.isMine ? <span className="text-xs text-[#6B7280]">{t("queueYourOwn")}</span> : null}
              </label>
              {failure ? (
                <p role="alert" className="mt-2 text-xs text-red-300">
                  {t(`result_${failure.message}`)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
