"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { searchCompanyDirectory, type CompanyDirectoryEntry, type RelationshipType } from "@/src/features/partners/data";
import { log } from "@/src/infrastructure/observability/logger";
import type { PartnerMessageKey } from "./messages";

export type PartnerActionResult = { ok: boolean; messageKey: PartnerMessageKey };

export async function searchCompanyDirectoryAction(query: string): Promise<CompanyDirectoryEntry[]> {
  return searchCompanyDirectory(query);
}

const adminRoles = ["owner", "admin", "administrator"];

export async function requestPartnershipAction(targetCompanyId: string, relationshipType: RelationshipType): Promise<PartnerActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const isAdmin = session.activeCompany!.roles.some((role) => adminRoles.includes(role));
  if (!isAdmin) return { ok: false, messageKey: "errNoPermissionRequest" };
  if (targetCompanyId === companyId) return { ok: false, messageKey: "errSelfPartnership" };

  const supabase = await createClient();
  const { error } = await supabase.from("company_relationships").insert({
    source_company_id: companyId,
    target_company_id: targetCompanyId,
    relationship_type: relationshipType,
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") return { ok: false, messageKey: "errRelationshipExists" };
    // #27: the code goes to the log, the constraint text never to the screen.
    log.error({ event: "partnership_request_failed", source: "requestPartnershipAction", companyId, code: error.code }, error);
    return { ok: false, messageKey: "errRequestFailed" };
  }

  revalidatePath("/dashboard/companies");
  return { ok: true, messageKey: "okRequestSent" };
}

async function respond(relationshipId: string, status: "active" | "rejected"): Promise<PartnerActionResult> {
  const { session, companyId } = await requireActiveCompany();
  const isAdmin = session.activeCompany!.roles.some((role) => adminRoles.includes(role));
  if (!isAdmin) return { ok: false, messageKey: "errNoPermissionRespond" };

  const supabase = await createClient();
  const { data: relationship } = await supabase.from("company_relationships").select("id,target_company_id,status").eq("id", relationshipId).maybeSingle();
  if (!relationship) return { ok: false, messageKey: "errRequestNotFound" };
  if (relationship.target_company_id !== companyId) return { ok: false, messageKey: "errNotTheInvitedCompany" };
  if (relationship.status !== "pending") return { ok: false, messageKey: "errAlreadyAnswered" };

  const { error } = await supabase.from("company_relationships").update({ status }).eq("id", relationshipId);
  if (error) {
    log.error({ event: "partnership_answer_failed", source: "respond", companyId, code: error.code }, error);
    return { ok: false, messageKey: "errAnswerFailed" };
  }

  revalidatePath("/dashboard/companies");
  return { ok: true, messageKey: status === "active" ? "okPartnershipAccepted" : "okPartnershipRejected" };
}

export async function acceptPartnershipAction(relationshipId: string) {
  return respond(relationshipId, "active");
}
export async function rejectPartnershipAction(relationshipId: string) {
  return respond(relationshipId, "rejected");
}
