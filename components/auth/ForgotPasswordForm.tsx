"use client";
import { useTranslations } from "next-intl";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/[locale]/auth/actions";
import { initialAuthState } from "@/app/[locale]/auth/state";
import AuthCard from "./AuthCard";
import AuthInput from "./AuthInput";
import AuthStatus from "./AuthStatus";
import AuthSubmitButton from "./AuthSubmitButton";

export default function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(requestPasswordResetAction, initialAuthState);
  return (
    <AuthCard action={action} title={t("forgotTitle")} description={t("forgotDescription")} footer={<Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-bright hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-brand-bright">← {t("backToSignIn")}</Link>}>
      <AuthInput id="reset-email" name="email" type="email" label={t("emailLabel")} autoComplete="email" placeholder={t("emailPlaceholder")} required />
      <AuthStatus state={state} />
      <AuthSubmitButton pendingLabel={t("forgotSending")}>{t("forgotSubmit")}</AuthSubmitButton>
    </AuthCard>
  );
}
