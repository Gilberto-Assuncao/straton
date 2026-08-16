"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { signInAction } from "@/app/[locale]/auth/actions";
import { initialAuthState, type AuthActionState, type AuthMessageKey } from "@/app/[locale]/auth/state";
import AuthCard from "./AuthCard";
import AuthDivider from "./AuthDivider";
import AuthInput from "./AuthInput";
import AuthStatus from "./AuthStatus";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";
import SocialAuthButtons from "./SocialAuthButtons";
import { useSubmittedValues } from "./useSubmittedValues";

export default function LoginForm({
  next = "/dashboard",
  callbackError,
}: {
  next?: string;
  /** A message key rather than a boolean: the callback can fail two ways. */
  callbackError?: AuthMessageKey;
}) {
  const t = useTranslations("login");
  const tAuth = useTranslations("auth");
  const initialState: AuthActionState = callbackError
    ? { status: "error", messageKey: callbackError }
    : initialAuthState;
  const [state, action] = useActionState(signInAction, initialState);

  // The e-mail survives a refusal; the password does not, and that asymmetry is
  // the point. Getting the address wrong should not cost you the password you
  // typed correctly — and putting a password back on screen after a failed
  // attempt is the opposite of what anybody wants (#74).
  const { touched, onInput, formKey } = useSubmittedValues(
    `${state.values?.email ?? ""}|${state.messageKey ?? ""}`,
  );

  return (
    <AuthCard action={action} title={t("title")} description={t("description")} footer={<>{t("newToStraton")} <Link href="/register" className="inline-flex min-h-11 items-center font-semibold text-[#22C55E] hover:text-[#16A34A] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("createAccount")}</Link></>}>
      <input type="hidden" name="next" value={next} />
      <AuthInput key={formKey} id="login-email" name="email" type="email" label={t("email")} autoComplete="email" placeholder={tAuth("emailPlaceholder")} defaultValue={state.values?.email ?? ""} onInput={onInput} required />
      <PasswordInput id="login-password" name="password" label={t("password")} autoComplete="current-password" placeholder={tAuth("passwordPlaceholder")} onInput={onInput} />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[#D1D5DB]"><input type="checkbox" name="remember" className="h-5 w-5 rounded border-white/20 accent-[#22C55E]" />{t("rememberMe")}</label>
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-medium text-[#22C55E] hover:text-[#16A34A] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("forgotPassword")}</Link>
      </div>
      {touched ? null : <AuthStatus state={state} />}
      <AuthSubmitButton pendingLabel={t("signingIn")}>{t("signIn")}</AuthSubmitButton>
      <AuthDivider />
      <SocialAuthButtons />
    </AuthCard>
  );
}
