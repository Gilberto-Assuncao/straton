"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { INVITE_TTL_DAYS, inviteUrl, mintInviteToken } from "./invite-token";
import type { RelationshipType } from "./data";

const MANAGER_ROLES = ["owner", "admin", "administrator", "manager"];
const RELATIONSHIP_TYPES: RelationshipType[] = ["client", "contractor", "subcontractor", "partner"];

export type InviteMessageKey =
  | "sent"
  | "sentLinkOnly"
  | "revoked"
  | "notAllowed"
  | "missingName"
  | "missingEmail"
  | "invalidType"
  | "alreadyPending"
  | "failed";

export type CompanyInviteResult =
  | {
      ok: true;
      message: InviteMessageKey;
      /**
       * Always returned, even when the email went out. Emails are lost, filed
       * as spam, or sent to the one address at the company nobody reads — and
       * the person doing the inviting usually has the subcontractor's phone
       * number right there.
       */
      link: string;
    }
  | { ok: false; message: InviteMessageKey };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Invites a company that is not on STRATON at all.
 *
 * The token exists only here and in the email. What is stored is its digest,
 * so this is the one moment the raw value is in play — hence returning it to
 * the caller rather than fetching it back later, which would be impossible.
 */
export async function inviteNewCompanyAction(formData: FormData): Promise<CompanyInviteResult> {
  const { companyId, session } = await requireActiveCompany();
  if (!session.activeCompany?.roles.some((role) => MANAGER_ROLES.includes(role))) {
    return { ok: false, message: "notAllowed" };
  }

  const companyName = text(formData, "companyName");
  if (companyName.length < 2) return { ok: false, message: "missingName" };

  const email = text(formData, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "missingEmail" };

  const relationshipType = text(formData, "relationshipType") as RelationshipType;
  if (!RELATIONSHIP_TYPES.includes(relationshipType)) return { ok: false, message: "invalidType" };

  const supabase = await createClient();

  // Re-inviting the same address for the same company just makes two live
  // tokens and a confused recipient.
  const { data: existing } = await supabase
    .from("company_invites")
    .select("id,expires_at")
    .eq("source_company_id", companyId)
    .eq("invited_email", email)
    .eq("status", "pending")
    .limit(1);

  const stillLive = ((existing ?? []) as { expires_at: string }[]).some(
    (row) => new Date(row.expires_at).getTime() > Date.now(),
  );
  if (stillLive) return { ok: false, message: "alreadyPending" };

  const { token, digest } = mintInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();

  const { error } = await supabase.from("company_invites").insert({
    token_digest: digest,
    source_company_id: companyId,
    relationship_type: relationshipType,
    company_name: companyName,
    registration_number: text(formData, "registrationNumber") || null,
    vat_number: text(formData, "vatNumber") || null,
    city: text(formData, "city") || null,
    postal_code: text(formData, "postalCode") || null,
    invited_email: email,
    note: text(formData, "note") || null,
    expires_at: expiresAt,
    created_by: session.user.id,
  });

  if (error) return { ok: false, message: "failed" };

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const link = inviteUrl(appUrl, token);

  /**
   * Delivery is best-effort, and deliberately not allowed to fail the invite.
   *
   * `inviteUserByEmail` only works for an address with no account yet. Someone
   * who already has a STRATON login — because they work at another company on
   * the platform — gets no email, and that is not an error: they get the link
   * instead, which the inviter can send however they normally talk to them.
   */
  let emailed = false;
  try {
    const admin = createAdminClient();
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      // Admin-generated links cannot use PKCE — that needs the same browser to
      // start and finish the flow, which is impossible when the link is emailed
      // to someone else. GoTrue delivers the session in the URL fragment, which
      // only client-side JS can read, so this must not route through the
      // server-side ?code= callback. Same constraint as the employee invite.
      redirectTo: link,
    });
    emailed = !inviteError;
  } catch {
    emailed = false;
  }

  revalidatePath("/dashboard/companies");
  return { ok: true, message: emailed ? "sent" : "sentLinkOnly", link };
}

export async function revokeCompanyInviteAction(inviteId: string): Promise<{ ok: boolean; message: InviteMessageKey }> {
  const { session } = await requireActiveCompany();
  if (!session.activeCompany?.roles.some((role) => MANAGER_ROLES.includes(role))) {
    return { ok: false, message: "notAllowed" };
  }

  const supabase = await createClient();
  // Revoked rather than deleted: an invitation that was sent and withdrawn is
  // a thing that happened, and the row is the only record of it.
  const { error } = await supabase.from("company_invites").update({ status: "revoked" }).eq("id", inviteId);
  if (error) return { ok: false, message: "failed" };

  revalidatePath("/dashboard/companies");
  return { ok: true, message: "revoked" };
}

export interface InvitePreview {
  inviterName: string;
  relationshipType: string;
  companyName: string;
  registrationNumber: string | null;
  vatNumber: string | null;
  city: string | null;
  postalCode: string | null;
  invitedEmail: string;
  note: string | null;
}

/** What the invitee sees before deciding. Nothing is revealed without the token. */
export async function previewCompanyInviteAction(token: string): Promise<InvitePreview | null> {
  if (!token) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("company_invite_preview", { p_token: token });
  if (error || !data || (data as unknown[]).length === 0) return null;

  const row = (data as Record<string, string | null>[])[0];
  return {
    inviterName: row.inviter_name ?? "",
    relationshipType: row.relationship_type ?? "partner",
    companyName: row.company_name ?? "",
    registrationNumber: row.registration_number,
    vatNumber: row.vat_number,
    city: row.city,
    postalCode: row.postal_code,
    invitedEmail: row.invited_email ?? "",
    note: row.note,
  };
}

export type AcceptResult = { ok: true; companyId: string } | { ok: false; message: "invalid" | "failed" };

export async function acceptCompanyInviteAction(formData: FormData): Promise<AcceptResult> {
  const token = text(formData, "token");
  if (!token) return { ok: false, message: "invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_company_invite", {
    p_token: token,
    p_company_name: text(formData, "companyName") || null,
    p_registration_number: text(formData, "registrationNumber") || null,
    p_vat_number: text(formData, "vatNumber") || null,
    p_address_line_1: text(formData, "addressLine1") || null,
    p_postal_code: text(formData, "postalCode") || null,
    p_city: text(formData, "city") || null,
    p_job_title: text(formData, "jobTitle") || null,
  });

  // The function refuses a token that is wrong, spent or expired with the same
  // message for all three, so this cannot tell them apart either — which is
  // the point.
  if (error || !data) return { ok: false, message: error ? "invalid" : "failed" };
  return { ok: true, companyId: data as string };
}
