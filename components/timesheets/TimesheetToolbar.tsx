"use client";

import { useTranslations } from "next-intl";

/**
 * Submitting your own week.
 *
 * Approve and Reject used to live here too, acting on "the filtered rows" — so
 * they only worked when the filter happened to isolate a single person's
 * timesheet, and otherwise printed a warning and did nothing. Reviewing is
 * per-person by nature, so it now lives in the approval queue where each week
 * is a row you can tick. Nothing left to warn about.
 */
export default function TimesheetToolbar({ feedback, onSubmit }: { feedback: string; onSubmit: () => void }) {
  const t = useTranslations("timesheets");
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="min-h-5 text-sm text-ink-muted">
        {feedback || t("toolbarDefaultFeedback")}
      </p>
      <button
        type="button"
        onClick={onSubmit}
        className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-semibold text-ink hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {t("submit")}
      </button>
    </div>
  );
}
