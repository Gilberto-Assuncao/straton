import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type { RelationshipType } from "./data";

// Re-exported so callers have one place to import from; the implementation
// lives outside `server-only` so the tests can reach it.
export { INVITE_TTL_DAYS, hashToken, inviteUrl, mintInviteToken } from "./invite-token";

export interface CompanyInvite {
  id: string;
  companyName: string;
  invitedEmail: string;
  relationshipType: RelationshipType;
  status: "pending" | "accepted" | "revoked";
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  /** True once the deadline has passed, even though the row still says pending. */
  expired: boolean;
}

interface InviteRow {
  id: string;
  company_name: string;
  invited_email: string;
  relationship_type: RelationshipType;
  status: "pending" | "accepted" | "revoked";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export async function getCompanyInvites(): Promise<CompanyInvite[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data } = await supabase
    .from("company_invites")
    .select("id,company_name,invited_email,relationship_type,status,expires_at,created_at,accepted_at")
    .eq("source_company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  const now = Date.now();
  return ((data ?? []) as InviteRow[]).map((row) => ({
    id: row.id,
    companyName: row.company_name,
    invitedEmail: row.invited_email,
    relationshipType: row.relationship_type,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    // Computed rather than stored: nothing sweeps the table, so a row can sit
    // at 'pending' long past its deadline and the database is still right.
    expired: row.status === "pending" && new Date(row.expires_at).getTime() < now,
  }));
}
