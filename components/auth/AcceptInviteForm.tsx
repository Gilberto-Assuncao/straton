"use client";
import { useTranslations } from "next-intl";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptInviteAction, type AcceptInviteState } from "@/src/features/employees/actions";
import { createClient } from "@/src/infrastructure/supabase/client";
import AuthCard from "./AuthCard";
import AuthStatus from "./AuthStatus";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";

const initialState: AcceptInviteState = { status: "idle" };

export default function AcceptInviteForm() {
  const t = useTranslations("auth");
  const [state, formAction] = useActionState(acceptInviteAction, initialState);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    // Invite links deliver the session as a URL fragment
    // (#access_token=...&refresh_token=...), never a query string — only the
    // browser can read a fragment. Parsed explicitly and applied via
    // setSession rather than relying on automatic hash detection, which in
    // testing did not reliably override an existing session already open in
    // the same browser (it once nearly overwrote an admin's own password).
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (token && refreshToken) {
      createClient().auth.setSession({ access_token: token, refresh_token: refreshToken }).finally(() => {
        setAccessToken(token);
        setReady(true);
        history.replaceState(null, "", window.location.pathname);
      });
    } else {
      queueMicrotask(() => setReady(true));
    }
  }, []);

  useEffect(() => {
    if (state.status === "success") router.push("/dashboard");
  }, [state.status, router]);

  if (!ready) return null;

  if (!accessToken) {
    return (
      <AuthCard title={t("inviteExpiredTitle")} description={t("inviteExpiredDescription")}>
        <Link href="/login" className="inline-flex min-h-11 items-center justify-center font-semibold text-brand-bright hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-brand-bright">{t("goToSignIn")}</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard action={formAction} title={t("inviteTitle")} description={t("inviteDescription")}>
      <input type="hidden" name="accessToken" value={accessToken} />
      <PasswordInput id="accept-invite-password" name="password" label={t("newPassword")} autoComplete="new-password" placeholder={t("atLeast8")} />
      <AuthStatus state={state} />
      <AuthSubmitButton pendingLabel={t("inviteActivating")}>{t("inviteSubmit")}</AuthSubmitButton>
    </AuthCard>
  );
}
