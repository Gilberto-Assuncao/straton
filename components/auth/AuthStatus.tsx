"use client";

import { useTranslations } from "next-intl";
import type { AuthActionState } from "@/app/[locale]/auth/state";

export default function AuthStatus({ state }: { state: AuthActionState }) {
  const t = useTranslations("auth");
  if (!state.messageKey) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${state.status === "error" ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-[#22C55E]/30 bg-[#22C55E]/10 text-green-100"}`}>
      {t(state.messageKey)}
    </p>
  );
}
