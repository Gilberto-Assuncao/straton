"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { signInAction } from "@/app/[locale]/auth/actions";
import { initialAuthState, type AuthActionState } from "@/app/[locale]/auth/state";
import AuthCard from "./AuthCard";
import AuthDivider from "./AuthDivider";
import AuthInput from "./AuthInput";
import AuthStatus from "./AuthStatus";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";
import SocialAuthButtons from "./SocialAuthButtons";

export default function LoginForm({ next = "/dashboard", callbackError = false }: { next?: string; callbackError?: boolean }) {
  const t = useTranslations("login");
  const initialState: AuthActionState = callbackError
    ? { status: "error", message: "The authentication callback could not be completed." }
    : initialAuthState;
  const [state, action] = useActionState(signInAction, initialState);
  return (
    <AuthCard action={action} title={t("title")} description={t("description")} footer={<>{t("newToStraton")} <Link href="/register" className="inline-flex min-h-11 items-center font-semibold text-[#22C55E] hover:text-[#16A34A] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("createAccount")}</Link></>}>
      <input type="hidden" name="next" value={next} />
      <AuthInput id="login-email" name="email" type="email" label={t("email")} autoComplete="email" placeholder="you@company.com" required />
      <PasswordInput id="login-password" name="password" label={t("password")} autoComplete="current-password" placeholder="Enter your password" />
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[#D1D5DB]"><input type="checkbox" name="remember" className="h-5 w-5 rounded border-white/20 accent-[#22C55E]" />{t("rememberMe")}</label>
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center font-medium text-[#22C55E] hover:text-[#16A34A] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("forgotPassword")}</Link>
      </div>
      <AuthStatus state={state} />
      <AuthSubmitButton pendingLabel={t("signingIn")}>{t("signIn")}</AuthSubmitButton>
      <AuthDivider />
      <SocialAuthButtons />
    </AuthCard>
  );
}
