"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/src/infrastructure/supabase/server";
import { ACTIVE_COMPANY_COOKIE } from "@/src/application/session/types";
import { hasPublicEnvironment } from "@/src/infrastructure/config/env";
import type { AuthActionState, AuthMessageKey } from "./state";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

async function origin() {
  const requestHeaders = await headers();
  return requestHeaders.get("origin") ?? process.env.APP_URL ?? "http://localhost:3000";
}

export async function signInAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!hasPublicEnvironment()) return { status: "error", messageKey: "errNotConfigured" };
  const email = text(formData, "email");
  const password = text(formData, "password");
  const next = safeNext(text(formData, "next") || "/dashboard");
  if (!email || !password) return { status: "error", messageKey: "errMissingCredentials" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", messageKey: "errBadCredentials" };
  redirect(next);
}

export async function registerAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!hasPublicEnvironment()) return { status: "error", messageKey: "errNotConfigured" };
  const fullName = text(formData, "fullName");
  const email = text(formData, "email");
  const password = text(formData, "password");
  const confirmation = text(formData, "confirmPassword");
  const accountType = text(formData, "accountType");

  if (fullName.length < 2 || !email || password.length < 8) {
    return { status: "error", messageKey: "errInvalidRegistration" };
  }
  if (password !== confirmation) return { status: "error", messageKey: "errPasswordMismatch" };
  if (formData.get("terms") !== "on") return { status: "error", messageKey: "errTermsRequired" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=/dashboard`,
      data: { full_name: fullName, account_type: accountType },
    },
  });

  if (error) return { status: "error", messageKey: "errNotConfigured" };
  if (data.session) redirect("/dashboard");
  return { status: "success", messageKey: "okConfirmInbox" };
}

export async function requestPasswordResetAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!hasPublicEnvironment()) return { status: "error", messageKey: "errNotConfigured" };
  const email = text(formData, "email");
  if (!email) return { status: "error", messageKey: "errInvalidEmail" };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  if (error) return { status: "error", messageKey: "errNotConfigured" };
  return { status: "success", messageKey: "okResetSent" };
}

export async function updatePasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!hasPublicEnvironment()) return { status: "error", messageKey: "errNotConfigured" };
  const password = text(formData, "password");
  const confirmation = text(formData, "confirmPassword");
  if (password.length < 8) return { status: "error", messageKey: "errPasswordTooShort" };
  if (password !== confirmation) return { status: "error", messageKey: "errPasswordMismatch" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { status: "error", messageKey: "errNotConfigured" };
  return { status: "success", messageKey: "okPasswordUpdated" };
}

export async function signOutAction() {
  if (!hasPublicEnvironment()) {
    (await cookies()).delete(ACTIVE_COMPANY_COOKIE);
    redirect("/login");
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_COMPANY_COOKIE);
  redirect("/login");
}

export async function switchCompanyAction(companyId: string): Promise<{ ok: boolean; messageKey?: AuthMessageKey }> {
  if (!hasPublicEnvironment()) return { ok: false, messageKey: "errNotConfigured" };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, messageKey: "errSessionExpired" };

  const { data: membership } = await supabase
    .from("company_memberships")
    .select("id, companies!inner(status)")
    .eq("company_id", companyId)
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .neq("companies.status", "archived")
    .maybeSingle();

  if (!membership) return { ok: false, messageKey: "errNoCompanyAccess" };

  (await cookies()).set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
