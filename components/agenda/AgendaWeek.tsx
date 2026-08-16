"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { changeAssignmentStatusAction, deleteAssignmentAction } from "@/src/features/assignments/actions";
import type { AgendaDay, AssignmentRecord, AssignmentStatus } from "@/src/features/assignments/types";
import RescheduleForm from "./RescheduleForm";

const statusTone: Record<AssignmentStatus, string> = {
  planned: "bg-white/10 text-ink-muted",
  sent: "bg-amber-400/10 text-amber-300",
  accepted: "bg-sky-400/10 text-sky-300",
  in_progress: "bg-brand/10 text-brand-bright",
  done: "bg-brand/20 text-brand-bright",
  cancelled: "bg-red-400/10 text-red-300",
};

function time(iso: string): string {
  return iso.slice(11, 16);
}

export default function AgendaWeek({
  days,
  today,
  sites = [],
}: {
  days: AgendaDay[];
  today: string;
  /** Only supplied for supervisors — the reschedule form needs somewhere to move a job to. */
  sites?: { id: string; name: string }[];
}) {
  const t = useTranslations("agenda");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  function move(id: string, status: AssignmentStatus) {
    startTransition(async () => {
      const result = await changeAssignmentStatusAction(id, status);
      setError(result.ok ? null : result.message);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteAssignmentAction(id);
      setError(result.ok ? null : result.message);
    });
  }

  return (
    <div>
      {error ? (
        <p role="status" className="mb-4 text-sm text-red-300">
          {t(`message_${error}` as "message_failed")}
        </p>
      ) : null}

      {/* Columns on a wide screen, a single scrollable list on a phone — where
          this is actually read, standing on a site. */}
      <div className="grid gap-4 lg:grid-cols-7">
        {days.map((day) => (
          <section
            key={day.date}
            aria-label={day.date}
            className={`rounded-2xl border p-4 ${
              day.date === today ? "border-brand/40 bg-surface" : "border-white/10 bg-surface/60"
            }`}
          >
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}
            </h3>

            {day.assignments.length === 0 ? (
              <p className="mt-4 text-xs text-[#4B5563]">{t("dayEmpty")}</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {day.assignments.map((assignment) => (
                  <li key={assignment.id} className="rounded-xl bg-surface-inset p-3">
                    <p className="text-sm font-medium text-ink">{assignment.title}</p>
                    <p className="mt-1 font-mono text-xs text-ink-subtle">
                      {time(assignment.startsAt)}–{time(assignment.endsAt)}
                    </p>
                    {assignment.siteName ? (
                      <p className="mt-1 truncate text-xs text-ink-muted">{assignment.siteName}</p>
                    ) : null}

                    <p className="mt-2 text-xs text-ink-muted">
                      {/* The team name instead of five, without losing the five:
                          the people are stored either way. */}
                      {assignment.teamName
                        ? t("bookedAsTeam", { team: assignment.teamName, count: assignment.assignees.length })
                        : assignment.assignees.map((person) => person.name).join(", ")}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${statusTone[assignment.status]}`}
                      >
                        {t(`status_${assignment.status}` as "status_planned")}
                      </span>
                      {assignment.availableTransitions.map((next) => (
                        <button
                          key={next}
                          type="button"
                          onClick={() => move(assignment.id, next)}
                          disabled={pending}
                          className="min-h-11 rounded-lg border border-white/15 px-3 text-xs font-semibold text-ink hover:bg-white/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          {t(`action_${next}` as "action_accepted")}
                        </button>
                      ))}
                      {assignment.canManage ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(editing === assignment.id ? null : assignment.id)}
                            disabled={pending}
                            className="min-h-11 rounded-lg border border-white/15 px-3 text-xs font-semibold text-ink hover:bg-white/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
                          >
                            {t("reschedule")}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(assignment.id)}
                            disabled={pending}
                            className="min-h-11 rounded-lg px-2 text-xs font-semibold text-ink-subtle hover:text-red-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
                          >
                            {t("remove")}
                          </button>
                        </>
                      ) : null}
                    </div>

                    {editing === assignment.id ? (
                      <RescheduleForm assignment={assignment} sites={sites} onDone={() => setEditing(null)} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export type { AssignmentRecord };
