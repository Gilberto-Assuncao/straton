"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { rescheduleAssignmentAction, type ConflictWarning } from "@/src/features/assignments/actions";
import type { AssignmentRecord } from "@/src/features/assignments/types";

const field =
  "min-h-11 w-full rounded-lg border border-edge-15 bg-canvas px-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-brand";

/**
 * Moving a job, from the card it is on (#49).
 *
 * Inline rather than a separate page: rescheduling happens while looking at the
 * week, usually because something else on it moved. Sending the supervisor to
 * another screen to change a time loses the context that prompted it.
 *
 * `datetime-local` wants "YYYY-MM-DDTHH:mm" in *local* time, and the record
 * carries an ISO string in UTC. Slicing the ISO string would silently shift the
 * value by the timezone offset — an hour or two, quietly, on every edit.
 */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function RescheduleForm({
  assignment,
  sites,
  onDone,
}: {
  assignment: AssignmentRecord;
  sites: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = useTranslations("agenda");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; key: string } | null>(null);
  const [warnings, setWarnings] = useState<ConflictWarning[]>([]);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await rescheduleAssignmentAction(formData);
      setMessage({ ok: result.ok, key: result.message });
      setWarnings(result.ok ? result.warnings : []);
      // Kept open when there are warnings: closing would hide the one thing
      // the supervisor needs to read.
      if (result.ok && result.warnings.length === 0) onDone();
    });
  }

  return (
    <form action={submit} className="mt-3 grid gap-2 rounded-lg border border-edge-10 bg-canvas p-3">
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <p className="text-xs font-semibold text-ink">{t("rescheduleTitle")}</p>

      <label className="grid gap-1">
        <span className="text-[10px] uppercase tracking-wide text-ink-subtle">{t("startsAtLabel")}</span>
        <input type="datetime-local" name="startsAt" defaultValue={toLocalInput(assignment.startsAt)} required className={field} />
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] uppercase tracking-wide text-ink-subtle">{t("endsAtLabel")}</span>
        <input type="datetime-local" name="endsAt" defaultValue={toLocalInput(assignment.endsAt)} required className={field} />
      </label>
      <label className="grid gap-1">
        <span className="text-[10px] uppercase tracking-wide text-ink-subtle">{t("siteLabel")}</span>
        <select name="siteId" defaultValue={assignment.siteId ?? ""} className={field}>
          <option value="">{t("noSite")}</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </label>

      {message ? (
        <p role="status" className={`text-xs ${message.ok ? "text-brand-bright" : "text-danger-soft"}`}>
          {t(`message_${message.key}` as "message_failed")}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-2">
          <p className="text-[11px] font-semibold text-warning-soft">{t("conflictTitle")}</p>
          <ul className="mt-1 grid gap-0.5 text-[11px] text-warning-soft">
            {warnings.map((warning, index) => (
              <li key={`${warning.name}-${index}`}>
                {t("conflictLine", {
                  name: warning.name,
                  reason: warning.reason ? t(`reason_${warning.reason}` as "reason_holiday") : t("reason_other"),
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-brand px-3 text-xs font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {pending ? t("saving") : t("rescheduleSave")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-11 rounded-lg border border-edge-15 px-3 text-xs font-semibold text-ink hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {t("rescheduleCancel")}
        </button>
      </div>
    </form>
  );
}
