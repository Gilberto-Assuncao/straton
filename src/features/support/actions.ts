"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import { log } from "@/src/infrastructure/observability/logger";
import { isPlatformAdmin, SUPPORT_SESSION_COOKIE } from "./data";
import { SUPPORT_SESSION_MINUTES, supportSessionExpiry } from "./session";

/**
 * Opening and closing a support session (#19).
 *
 * Opening one is not a silent act. It writes a row into the *customer's own*
 * audit log — their company, their existing read policy — so the fact that
 * somebody from the platform looked at their data is theirs to see, without
 * asking us and without us having to remember to tell them.
 */
export type SupportMessageKey =
  | "supportStarted"
  | "supportEnded"
  | "supportNotAllowed"
  | "supportUnknownCompany"
  | "supportFailed";

export interface SupportResult {
  ok: boolean;
  message: SupportMessageKey;
}

export async function startSupportSessionAction(formData: FormData): Promise<SupportResult> {
  const session = await requireAuthenticatedSession();
  if (!(await isPlatformAdmin())) return { ok: false, message: "supportNotAllowed" };

  const companyId = String(formData.get("companyId") ?? "").trim();
  if (!companyId) return { ok: false, message: "supportUnknownCompany" };

  const admin = createAdminClient();
  const { data: company } = await admin.from("companies").select("id").eq("id", companyId).maybeSingle();
  if (!company) return { ok: false, message: "supportUnknownCompany" };

  const startedAt = new Date();
  const { data, error } = await admin
    .from("support_sessions")
    .insert({
      admin_user_id: session.user.id,
      company_id: companyId,
      started_at: startedAt.toISOString(),
      expires_at: supportSessionExpiry(startedAt),
    })
    .select("id");

  if (error || !data || data.length === 0) {
    if (error) log.error({ event: "support_session_start_failed", source: "startSupportSessionAction", code: error.code });
    return { ok: false, message: "supportFailed" };
  }

  /**
   * The customer's own record that this happened.
   *
   * Written before the cookie is set, so a failure to record leaves no session
   * rather than an unrecorded one. `audit_logs` is read by company members
   * through a policy that already exists — nothing here grants them anything
   * new, and nothing hides it from them either.
   */
  const { error: auditError } = await admin.from("audit_logs").insert({
    company_id: companyId,
    actor_id: session.user.id,
    action: "support_session_started",
    entity_type: "company",
    entity_id: companyId,
    metadata: { minutes: SUPPORT_SESSION_MINUTES, access: "read-only" },
  });
  if (auditError) {
    log.error({ event: "support_audit_failed", source: "startSupportSessionAction", code: auditError.code });
    await admin.from("support_sessions").update({ ended_at: new Date().toISOString() }).eq("id", data[0].id);
    return { ok: false, message: "supportFailed" };
  }

  (await cookies()).set(SUPPORT_SESSION_COOKIE, data[0].id as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SUPPORT_SESSION_MINUTES * 60,
  });

  revalidatePath("/dashboard/support");
  return { ok: true, message: "supportStarted" };
}

export async function endSupportSessionAction(): Promise<SupportResult> {
  const session = await requireAuthenticatedSession();
  const jar = await cookies();
  const id = jar.get(SUPPORT_SESSION_COOKIE)?.value;
  // The cookie goes first and unconditionally. Whatever the database says, this
  // browser stops carrying a support session — a failure to close the row must
  // not leave the tab still in support mode.
  jar.delete(SUPPORT_SESSION_COOKIE);
  if (!id) return { ok: true, message: "supportEnded" };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id)
    .eq("admin_user_id", session.user.id)
    .is("ended_at", null)
    .select("id,company_id");

  if (error) {
    log.error({ event: "support_session_end_failed", source: "endSupportSessionAction", code: error.code });
    return { ok: false, message: "supportFailed" };
  }

  if (data && data.length > 0) {
    await admin.from("audit_logs").insert({
      company_id: data[0].company_id as string,
      actor_id: session.user.id,
      action: "support_session_ended",
      entity_type: "company",
      entity_id: data[0].company_id as string,
      metadata: {},
    });
  }

  revalidatePath("/dashboard/support");
  return { ok: true, message: "supportEnded" };
}
