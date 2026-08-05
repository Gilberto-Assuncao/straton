"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createAssignmentAction, type ConflictWarning } from "@/src/features/assignments/actions";
import type { AssignmentOptions } from "@/src/features/assignments/data";

const field =
  "min-h-11 w-full rounded-lg border border-white/15 bg-[#111C33] px-3 text-sm text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]";
const labelText = "text-xs text-[#9CA3AF]";

export default function AssignmentForm({ options }: { options: AssignmentOptions }) {
  const t = useTranslations("agenda");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; key: string } | null>(null);
  const [warnings, setWarnings] = useState<ConflictWarning[]>([]);
  const [mode, setMode] = useState<"people" | "team">("people");

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createAssignmentAction(formData);
      setMessage({ ok: result.ok, key: result.message });
      setWarnings(result.ok ? result.warnings : []);
    });
  }

  return (
    <form action={submit} className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("formTitle")}</h2>
      <p className="mt-1 text-sm text-[#9CA3AF]">{t("formHint")}</p>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-1.5">
          <span className={labelText}>{t("titleLabel")}</span>
          <input name="title" required minLength={2} className={field} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelText}>{t("startsAtLabel")}</span>
            <input type="datetime-local" name="startsAt" required className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelText}>{t("endsAtLabel")}</span>
            <input type="datetime-local" name="endsAt" required className={field} />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={labelText}>{t("siteLabel")}</span>
          <select name="siteId" className={field} defaultValue="">
            <option value="">{t("noSite")}</option>
            {options.sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>

        {/* Two ways to book, and the choice is remembered in the record: the
            interface can then say "Solar Team" rather than listing five names. */}
        <fieldset className="grid gap-2">
          <legend className={labelText}>{t("assignToLabel")}</legend>
          <div className="flex gap-2">
            {(["people", "team"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={`min-h-11 rounded-lg border px-4 text-sm font-semibold ${
                  mode === option
                    ? "border-[#22C55E] bg-[#22C55E]/10 text-[#4ADE80]"
                    : "border-white/15 text-[#9CA3AF] hover:bg-white/5"
                }`}
              >
                {t(`assignBy_${option}` as "assignBy_people")}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === "team" ? (
          <label className="grid gap-1.5">
            <span className={labelText}>{t("teamLabel")}</span>
            <select name="teamId" className={field} required>
              <option value="">{t("chooseTeam")}</option>
              {options.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-[#6B7280]">{t("teamFreezeHint")}</span>
          </label>
        ) : (
          <fieldset className="grid gap-1.5">
            <legend className={labelText}>{t("peopleLabel")}</legend>
            <div className="mt-1 grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-white/10 p-2">
              {options.people.map((person) => (
                <label key={person.membershipId} className="flex min-h-11 items-center gap-3 px-2 text-sm text-[#D1D5DB]">
                  <input type="checkbox" name="assigneeIds" value={person.membershipId} className="size-4" />
                  {person.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="grid gap-1.5">
          <span className={labelText}>{t("instructionsLabel")}</span>
          <textarea name="instructions" rows={3} className={`${field} py-2`} />
        </label>
      </div>

      {message ? (
        <p role="status" className={`mt-4 text-sm ${message.ok ? "text-[#4ADE80]" : "text-red-300"}`}>
          {t(`message_${message.key}` as "message_created")}
        </p>
      ) : null}

      {warnings.length > 0 ? (
        // A warning, never a refusal: a holiday gets cancelled, someone
        // volunteers, and a supervisor who knows something the system does not
        // should not be stopped by it. Booking *blind* is the thing to prevent.
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <p className="text-sm font-semibold text-amber-300">{t("conflictTitle")}</p>
          <ul className="mt-2 grid gap-1 text-xs text-amber-200/80">
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

      <button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
      >
        {pending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
