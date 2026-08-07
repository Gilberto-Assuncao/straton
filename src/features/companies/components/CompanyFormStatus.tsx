"use client";
import { useTranslations } from "next-intl";
import type { CompanyActionState } from "../types";

export function CompanyFormStatus({ state }: { state: CompanyActionState }) {
  const t = useTranslations("companies");
  if (!state.messageKey) return null;

  return (
    <p
      aria-live="polite"
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-xl border p-3 text-sm ${
        state.status === "error"
          ? "border-red-400/30 bg-red-400/10 text-red-200"
          : "border-green-400/30 bg-green-400/10 text-green-100"
      }`}
    >
      {/* The action named the outcome; the sentence is chosen here, where the
          locale is actually known. */}
      {t(`message_${state.messageKey}` as "message_failed")}
    </p>
  );
}
