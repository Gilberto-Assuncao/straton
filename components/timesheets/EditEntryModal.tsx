"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { editTimeEntryAction } from "@/src/features/timesheets/actions";
import type { Option, TimesheetEntry } from "@/lib/types/timesheet";

const field =
  "mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20";

/**
 * Correcting an entry that came in wrong from the field (#56).
 *
 * The dialog used to collect the changes and throw them away — it closed, said
 * "ready for backend integration", and wrote nothing. It also edited the
 * project and task by *name*, which cannot be saved back to rows keyed by id.
 * Both are fixed here.
 *
 * The date is not editable. This corrects a shift, not which day someone
 * worked; moving an entry across days would move hours into another week, and
 * possibly onto a timesheet that has already been approved.
 */
export default function EditEntryModal({
  entry,
  tasks,
  sites,
  onClose,
  onSaved,
}: {
  entry: TimesheetEntry;
  tasks: Option[];
  sites: Option[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const t = useTranslations("timesheets");
  const closeRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const [siteId, setSiteId] = useState(entry.siteId ?? "");
  const [taskId, setTaskId] = useState(entry.taskId ?? "");
  const [startTime, setStartTime] = useState(entry.startTime);
  const [endTime, setEndTime] = useState(entry.endTime);
  const [breakMinutes, setBreakMinutes] = useState(String(entry.breakMinutes));
  const [notes, setNotes] = useState(entry.notes);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await editTimeEntryAction({
        entryId: entry.id,
        startTime,
        endTime,
        breakMinutes: Number(breakMinutes),
        siteId: siteId || null,
        taskId: taskId || null,
        notes,
      });
      // A refusal keeps the dialog open with the values still in it. Closing on
      // failure would discard the correction and leave the old numbers on
      // screen, which reads exactly like success.
      if (!result.ok) {
        setError(t(`result_${result.message}`));
        return;
      }
      onSaved(t(`result_${result.message}`));
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-entry-title"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#161A34] p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 id="edit-entry-title" className="text-xl font-semibold text-[#E5E7EB]">
              {t("editEntryTitle")}
            </h3>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              {entry.employee} · {entry.date}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("editEntryClose")}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-xl text-[#9CA3AF] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-task" className="text-sm font-medium text-[#D1D5DB]">
                {t("fieldTask")}
              </label>
              <select id="edit-task" value={taskId} onChange={(event) => setTaskId(event.target.value)} className={field}>
                <option value="">—</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.name}
                  </option>
                ))}
              </select>
            </div>
            {/*
              The field this dialog exists for, as much as the times. Entries
              logged before #55 have no chantier at all, and this is the only
              way to give them one.
            */}
            <div className="sm:col-span-2">
              <label htmlFor="edit-site" className="text-sm font-medium text-[#D1D5DB]">
                {t("fieldSite")}
              </label>
              <select id="edit-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className={field}>
                <option value="">{t("fieldNoSite")}</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-start" className="text-sm font-medium text-[#D1D5DB]">
                {t("fieldStart")}
              </label>
              <input
                id="edit-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
                className={`${field} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label htmlFor="edit-end" className="text-sm font-medium text-[#D1D5DB]">
                {t("fieldEnd")}
              </label>
              <input
                id="edit-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
                className={`${field} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label htmlFor="edit-break" className="text-sm font-medium text-[#D1D5DB]">
                {t("fieldBreak")}
              </label>
              <input
                id="edit-break"
                type="number"
                min="0"
                max="480"
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(event.target.value)}
                required
                className={field}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-notes" className="text-sm font-medium text-[#D1D5DB]">
              {t("fieldNotes")}
            </label>
            <textarea
              id="edit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={300}
              rows={3}
              className={`${field} py-3`}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E] disabled:opacity-50"
            >
              {t("save")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
