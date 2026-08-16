"use client";
import { useTranslations } from "next-intl";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/[locale]/auth/actions";
import { initialAuthState } from "@/app/[locale]/auth/state";
import AuthCard from "./AuthCard";
import AuthStatus from "./AuthStatus";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";

export default function ResetPasswordForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(updatePasswordAction, initialAuthState);
  return (
    <AuthCard action={action} title={t("resetTitle")} description={t("resetDescription")} footer={state.status === "success" ? <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-bright">{t("continueToSignIn")}</Link> : undefined}>
      <PasswordInput id="new-password" name="password" label={t("newPassword")} autoComplete="new-password" placeholder={t("atLeast8")} />
      <PasswordInput id="confirm-new-password" name="confirmPassword" label={t("confirmPassword")} autoComplete="new-password" placeholder={t("repeatPassword")} />
      <AuthStatus state={state} />
      <AuthSubmitButton pendingLabel={t("resetUpdating")}>{t("resetSubmit")}</AuthSubmitButton>
    </AuthCard>
  );
}
