"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { declareAvailabilityAction, type AvailabilityState } from "@/src/features/availability/actions";
import { AVAILABILITY_REASONS } from "@/src/features/availability/types";

const field =
  "min-h-11 w-full rounded-lg border border-white/15 bg-surface-inset px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand";
const label = "grid gap-1.5 text-sm";
const labelText = "text-xs text-ink-muted";

const initial: AvailabilityState = { status: "idle", message: null };

export default function AvailabilityForm({
  people,
  myMembershipId,
  isManager,
}: {
  people: { membershipId: string; name: string }[];
  myMembershipId: string;
  isManager: boolean;
}) {
  const t = useTranslations("availability");
  const [state, formAction, pending] = useActionState(declareAvailabilityAction, initial);

  /*
   * Seeded from what was submitted, so a refusal does not empty the form (#45
   * neighbourhood, reported directly). Losing the dates and the note on every
   * error means retyping them next to a message that describes an attempt you
   * can no longer see — which is how a stale "end must be after the start"
   * ended up sitting above a perfectly good pair of dates.
   *
   * Keyed on the returned values so a successful save clears everything, and a
   * refusal keeps it.
   */
  const submitted = state.values;
  const [kind, setKind] = useState(submitted?.kind || "unavailable");
  const [startsAt, setStartsAt] = useState(submitted?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(submitted?.endsAt ?? "");
  const [note, setNote] = useState(submitted?.note ?? "");
  const [touched, setTouched] = useState(false);

  // The message belongs to the attempt that produced it. Once the person edits
  // anything, it is describing something that no longer exists.
  const seed = `${submitted?.startsAt ?? ""}|${submitted?.endsAt ?? ""}|${submitted?.note ?? ""}|${state.message ?? ""}`;
  const [seenSeed, setSeenSeed] = useState(seed);
  if (seenSeed !== seed) {
    setSeenSeed(seed);
    setKind(submitted?.kind || "unavailable");
    setStartsAt(submitted?.startsAt ?? "");
    setEndsAt(submitted?.endsAt ?? "");
    setNote(submitted?.note ?? "");
    setTouched(false);
  }

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">{t("formTitle")}</h2>
      <p className="mt-1 text-sm text-ink-muted">{isManager ? t("formHintManager") : t("formHintWorker")}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className={label}>
          <span className={labelText}>{t("personLabel")}</span>
          {/*
            A worker gets a fixed field rather than a one-option select: a
            dropdown you cannot change is a control that lies about what it does.
          */}
          {isManager ? (
            <select name="membershipId" defaultValue={myMembershipId} className={field} required>
              {people.map((person) => (
                <option key={person.membershipId} value={person.membershipId}>
                  {person.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input type="hidden" name="membershipId" value={myMembershipId} />
              <p className="flex min-h-11 items-center text-sm text-ink-soft">
                {people.find((person) => person.membershipId === myMembershipId)?.name ?? ""}
              </p>
            </>
          )}
        </label>

        <label className={label}>
          <span className={labelText}>{t("kindLabel")}</span>
          <select name="kind" value={kind} onChange={(event) => { setKind(event.target.value); setTouched(true); }} className={field}>
            <option value="unavailable">{t("kind_unavailable")}</option>
            <option value="available">{t("kind_available")}</option>
          </select>
        </label>

        <label className={label}>
          <span className={labelText}>{t("startsAtLabel")}</span>
          <input type="date" name="startsAt" value={startsAt} onChange={(event) => { setStartsAt(event.target.value); setTouched(true); }} className={field} required />
        </label>

        <label className={label}>
          <span className={labelText}>{t("endsAtLabel")}</span>
          <input type="date" name="endsAt" value={endsAt} onChange={(event) => { setEndsAt(event.target.value); setTouched(true); }} className={field} required />
        </label>

        {kind === "unavailable" ? (
          <label className={label}>
            <span className={labelText}>{t("reasonLabel")}</span>
            <select name="reason" className={field} required defaultValue={submitted?.reason || "holiday"}>
              {AVAILABILITY_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {t(`reason_${reason}` as "reason_holiday")}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className={label}>
          <span className={labelText}>{t("noteLabel")}</span>
          <input name="note" value={note} onChange={(event) => { setNote(event.target.value); setTouched(true); }} maxLength={280} className={field} />
          <span className="text-xs text-ink-subtle">{t("noteHint")}</span>
        </label>
      </div>

      {state.message && !touched ? (
        <p
          role="status"
          className={`mt-4 text-sm ${state.status === "success" ? "text-brand-bright" : "text-red-300"}`}
        >
          {t(`message_${state.message}` as "message_created")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
      >
        {pending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
