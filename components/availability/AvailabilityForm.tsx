"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { declareAvailabilityAction, type AvailabilityState } from "@/src/features/availability/actions";
import { AVAILABILITY_REASONS } from "@/src/features/availability/types";

const field =
  "min-h-11 w-full rounded-lg border border-white/15 bg-[#111C33] px-3 text-sm text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]";
const label = "grid gap-1.5 text-sm";
const labelText = "text-xs text-[#9CA3AF]";

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
  const [kind, setKind] = useState("unavailable");

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("formTitle")}</h2>
      <p className="mt-1 text-sm text-[#9CA3AF]">{isManager ? t("formHintManager") : t("formHintWorker")}</p>

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
              <p className="flex min-h-11 items-center text-sm text-[#D1D5DB]">
                {people.find((person) => person.membershipId === myMembershipId)?.name ?? ""}
              </p>
            </>
          )}
        </label>

        <label className={label}>
          <span className={labelText}>{t("kindLabel")}</span>
          <select name="kind" value={kind} onChange={(event) => setKind(event.target.value)} className={field}>
            <option value="unavailable">{t("kind_unavailable")}</option>
            <option value="available">{t("kind_available")}</option>
          </select>
        </label>

        <label className={label}>
          <span className={labelText}>{t("startsAtLabel")}</span>
          <input type="date" name="startsAt" className={field} required />
        </label>

        <label className={label}>
          <span className={labelText}>{t("endsAtLabel")}</span>
          <input type="date" name="endsAt" className={field} required />
        </label>

        {kind === "unavailable" ? (
          <label className={label}>
            <span className={labelText}>{t("reasonLabel")}</span>
            <select name="reason" className={field} required defaultValue="holiday">
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
          <input name="note" maxLength={280} className={field} />
          <span className="text-xs text-[#6B7280]">{t("noteHint")}</span>
        </label>
      </div>

      {state.message ? (
        <p
          role="status"
          className={`mt-4 text-sm ${state.status === "success" ? "text-[#4ADE80]" : "text-red-300"}`}
        >
          {t(`message_${state.message}` as "message_created")}
        </p>
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
