"use client";
import { useTranslations } from "next-intl";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/[locale]/auth/actions";
import { initialAuthState } from "@/app/[locale]/auth/state";
import AuthCard from "./AuthCard";
import AuthDivider from "./AuthDivider";
import AuthInput from "./AuthInput";
import AuthStatus from "./AuthStatus";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";
import SocialAuthButtons from "./SocialAuthButtons";

export default function RegisterForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(registerAction, initialAuthState);
  return (
    <AuthCard action={action} title={t("registerTitle")} description={t("registerDescription")} footer={<>{t("alreadyHaveAccount")} <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-[#22C55E] hover:text-[#16A34A] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("signIn")}</Link></>}>
      <fieldset><legend className="mb-2 text-sm font-medium text-[#E5E7EB]">{t("accountType")}</legend><div className="grid grid-cols-2 gap-3">{([["individual", t("accountIndividual")], ["company", t("accountCompany")]] as const).map(([value, type]) => <label key={value} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#111827] px-3 text-sm font-medium has-checked:border-[#22C55E] has-checked:bg-[#22C55E]/10"><input type="radio" name="accountType" value={value} defaultChecked={value === "individual"} className="h-4 w-4 accent-[#22C55E]" />{type}</label>)}</div></fieldset>
      <AuthInput id="full-name" name="fullName" type="text" label={t("fullName")} autoComplete="name" placeholder={t("fullNamePlaceholder")} required />
      <AuthInput id="register-email" name="email" type="email" label={t("workEmail")} autoComplete="email" placeholder={t("emailPlaceholder")} required />
      <PasswordInput id="register-password" name="password" label={t("passwordLabel")} autoComplete="new-password" placeholder={t("atLeast8")} />
      <PasswordInput id="confirm-password" name="confirmPassword" label={t("confirmPassword")} autoComplete="new-password" placeholder={t("repeatPassword")} />
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#D1D5DB]"><input type="checkbox" name="terms" required className="mt-1 h-5 w-5 shrink-0 rounded border-white/20 accent-[#22C55E]" /><span>{t("acceptPrefix")} <a href="#" className="font-medium text-[#22C55E] hover:text-[#16A34A]">{t("termsOfService")}</a> {t("and")} <a href="#" className="font-medium text-[#22C55E] hover:text-[#16A34A]">{t("privacyPolicy")}</a>.</span></label>
      <AuthStatus state={state} />
      <AuthSubmitButton pendingLabel={t("creatingAccount")}>{t("createAccount")}</AuthSubmitButton>
      <AuthDivider />
      <SocialAuthButtons />
    </AuthCard>
  );
}
