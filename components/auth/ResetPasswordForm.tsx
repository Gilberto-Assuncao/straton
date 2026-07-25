"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updatePasswordAction } from "@/app/[locale]/auth/actions";
import { initialAuthState } from "@/app/[locale]/auth/state";
import AuthCard from "./AuthCard";
import AuthStatus from "./AuthStatus";
import AuthSubmitButton from "./AuthSubmitButton";
import PasswordInput from "./PasswordInput";

export default function ResetPasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initialAuthState);
  return (
    <AuthCard action={action} title="Choose a new password" description="Create a secure password for your STRATON account." footer={state.status === "success" ? <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-[#22C55E]">Continue to sign in</Link> : undefined}>
      <PasswordInput id="new-password" name="password" label="New password" autoComplete="new-password" placeholder="At least 8 characters" />
      <PasswordInput id="confirm-new-password" name="confirmPassword" label="Confirm password" autoComplete="new-password" placeholder="Repeat your password" />
      <AuthStatus state={state} />
      <AuthSubmitButton pendingLabel="Updating…">Update password</AuthSubmitButton>
    </AuthCard>
  );
}
