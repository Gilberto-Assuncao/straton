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
import { useSubmittedValues } from "./useSubmittedValues";

export default function RegisterForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(registerAction, initialAuthState);

  // The most common way to fail this form is mistyping the confirmation, and
  // the cost of that was retyping a name, an e-mail and an account type as
  // well. Those three come back; neither password does (#74).
  const { touched, onInput, formKey } = useSubmittedValues(
    `${state.values?.fullName ?? ""}|${state.values?.email ?? ""}|${state.values?.accountType ?? ""}|${state.messageKey ?? ""}`,
  );
  const chosenType = state.values?.accountType ?? "individual";

  return (
    <AuthCard action={action} title={t("registerTitle")} description={t("registerDescription")} footer={<>{t("alreadyHaveAccount")} <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-brand-bright hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-brand-bright">{t("signIn")}</Link></>}>
      <fieldset><legend className="mb-2 text-sm font-medium text-ink">{t("accountType")}</legend><div key={formKey} className="grid grid-cols-2 gap-3">{([["individual", t("accountIndividual")], ["company", t("accountCompany")]] as const).map(([value, type]) => <label key={value} className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-edge-15 bg-surface-alt px-3 text-sm font-medium has-checked:border-brand has-checked:bg-brand/10"><input type="radio" name="accountType" value={value} onInput={onInput} defaultChecked={value === chosenType} className="h-4 w-4 accent-brand" />{type}</label>)}</div></fieldset>
      <AuthInput key={`name-${formKey}`} id="full-name" name="fullName" type="text" label={t("fullName")} autoComplete="name" placeholder={t("fullNamePlaceholder")} defaultValue={state.values?.fullName ?? ""} onInput={onInput} required />
      <AuthInput key={`email-${formKey}`} id="register-email" name="email" type="email" label={t("workEmail")} autoComplete="email" placeholder={t("emailPlaceholder")} defaultValue={state.values?.email ?? ""} onInput={onInput} required />
      <PasswordInput id="register-password" name="password" label={t("passwordLabel")} autoComplete="new-password" placeholder={t("atLeast8")} onInput={onInput} />
      <PasswordInput id="confirm-password" name="confirmPassword" label={t("confirmPassword")} autoComplete="new-password" placeholder={t("repeatPassword")} onInput={onInput} />
      <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink-soft"><input type="checkbox" name="terms" required className="mt-1 h-5 w-5 shrink-0 rounded border-edge-20 accent-brand" /><span>{t("acceptPrefix")} <a href="#" className="font-medium text-brand-bright hover:text-brand-hover">{t("termsOfService")}</a> {t("and")} <a href="#" className="font-medium text-brand-bright hover:text-brand-hover">{t("privacyPolicy")}</a>.</span></label>
      {touched ? null : <AuthStatus state={state} />}
      <AuthSubmitButton pendingLabel={t("creatingAccount")}>{t("createAccount")}</AuthSubmitButton>
      <AuthDivider />
      <SocialAuthButtons />
    </AuthCard>
  );
}
