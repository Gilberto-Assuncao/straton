"use client";

import { useTranslations } from "next-intl";
import type { AuthActionState } from "@/app/[locale]/auth/state";

export default function AuthStatus({ state }: { state: AuthActionState }) {
  const t = useTranslations("auth");
  if (!state.messageKey) return null;
  return (
    // Named, because `getByRole("alert")` is ambiguous here by construction:
    // Next renders its own route announcer with the same role on every page,
    // so a test written against the role alone matches two things and asserts
    // on whichever it happened to resolve.
    <p
      id="auth-status"
      role={state.status === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${state.status === "error" ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-brand/30 bg-brand/10 text-green-100"}`}>
      {t(state.messageKey)}
    </p>
  );
}
