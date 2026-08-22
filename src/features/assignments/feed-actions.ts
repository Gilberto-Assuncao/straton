"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { log } from "@/src/infrastructure/observability/logger";
import { agendaFeedUrl, mintFeedToken } from "./feed-token";

export type AgendaFeedMessageKey = "feedCreated" | "feedRevoked" | "feedNothingToRevoke" | "feedFailed";

export type AgendaFeedResult =
  /**
   * The URL comes back exactly once, on the call that created it.
   *
   * Only the digest is stored, so there is nowhere to read it from afterwards —
   * the same trade the company invite makes. Lost means regenerate, which is a
   * worse afternoon than storing it and a much better year.
   */
  | { ok: true; message: AgendaFeedMessageKey; url?: string }
  | { ok: false; message: AgendaFeedMessageKey };

export async function createAgendaFeedAction(): Promise<AgendaFeedResult> {
  const { companyId, session } = await requireActiveCompany();
  const membershipId = session.activeCompany?.membershipId;
  if (!membershipId) return { ok: false, message: "feedFailed" };

  const supabase = await createClient();

  // Revoke first, and unconditionally. The partial unique index allows one live
  // feed per membership, so an insert without this fails on conflict — and
  // "regenerate" has to mean the old URL stops working, or a leaked link
  // outlives the act of replacing it.
  const { error: revokeError } = await supabase
    .from("agenda_feeds")
    .update({ revoked_at: new Date().toISOString() })
    .eq("company_membership_id", membershipId)
    .is("revoked_at", null);

  if (revokeError) {
    log.error({ event: "agenda_feed_revoke_failed", source: "createAgendaFeedAction", companyId, code: revokeError.code });
    return { ok: false, message: "feedFailed" };
  }

  const { token, digest } = mintFeedToken();
  const { data, error } = await supabase
    .from("agenda_feeds")
    .insert({ company_id: companyId, company_membership_id: membershipId, token_digest: digest })
    .select("id");

  if (error) {
    log.error({ event: "agenda_feed_create_failed", source: "createAgendaFeedAction", companyId, code: error.code });
    return { ok: false, message: "feedFailed" };
  }

  // A policy that refuses a write refuses it by matching no rows, not by
  // raising — so a returned array of length zero is a failure that looks
  // exactly like a success from the error object alone.
  if (!data || data.length === 0) {
    log.error({ event: "agenda_feed_create_no_rows", source: "createAgendaFeedAction", companyId });
    return { ok: false, message: "feedFailed" };
  }

  revalidatePath("/dashboard/agenda");
  return {
    ok: true,
    message: "feedCreated",
    url: agendaFeedUrl(process.env.APP_URL ?? "http://localhost:3000", token),
  };
}

export async function revokeAgendaFeedAction(): Promise<AgendaFeedResult> {
  const { companyId, session } = await requireActiveCompany();
  const membershipId = session.activeCompany?.membershipId;
  if (!membershipId) return { ok: false, message: "feedFailed" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda_feeds")
    .update({ revoked_at: new Date().toISOString() })
    .eq("company_membership_id", membershipId)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    log.error({ event: "agenda_feed_revoke_failed", source: "revokeAgendaFeedAction", companyId, code: error.code });
    return { ok: false, message: "feedFailed" };
  }

  // Nothing matched: either there was no live feed, or a policy refused. Both
  // deserve to be said out loud rather than reported as a revocation that never
  // happened — the silence this repo has found on four tables already.
  if (!data || data.length === 0) return { ok: false, message: "feedNothingToRevoke" };

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "feedRevoked" };
}
