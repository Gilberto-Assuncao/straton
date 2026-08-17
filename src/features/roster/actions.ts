"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import type { RosterRoleKey } from "@/lib/types/roster";
import { log } from "@/src/infrastructure/observability/logger";
import type { RosterMessageKey } from "./messages";

export type RosterActionState = {
  status: "idle" | "success" | "error";
  /** null while idle. A key into `roster`, never a sentence (#104). */
  messageKey: RosterMessageKey | null;
};

const adminRoles = ["owner", "admin", "administrator"];
const ROSTER_ROLE_KEYS: RosterRoleKey[] = ["manager", "accountant", "hr", "finance"];

export async function toggleRosterRoleAction(
  membershipId: string,
  roleKey: RosterRoleKey,
  assign: boolean,
): Promise<RosterActionState> {
  const { session, companyId } = await requireActiveCompany();
  const isAdmin = session.activeCompany!.roles.some((role) => adminRoles.includes(role));
  if (!isAdmin) return { status: "error", messageKey: "errNoPermission" };
  if (!ROSTER_ROLE_KEYS.includes(roleKey)) return { status: "error", messageKey: "errUnknownRole" };

  const supabase = await createClient();

  const [{ data: membership }, { data: roleRow }] = await Promise.all([
    supabase.from("company_memberships").select("id").eq("id", membershipId).eq("company_id", companyId).maybeSingle(),
    supabase.from("roles").select("id").eq("key", roleKey).maybeSingle(),
  ]);
  if (!membership) return { status: "error", messageKey: "errMemberNotFound" };
  if (!roleRow) return { status: "error", messageKey: "errRoleNotResolved" };

  if (assign) {
    const { error } = await supabase.from("membership_roles").insert({ membership_id: membershipId, role_id: roleRow.id });
    if (error && error.code !== "23505") {
      // Was a `console.error` carrying `error.message`, which is both a raw
      // provider string and invisible to the structured log (#27).
      log.error({ event: "roster_role_insert_failed", source: "toggleRosterRoleAction", companyId, code: error.code }, error);
      return { status: "error", messageKey: "errRoleUpdateFailed" };
    }
  } else {
    const { error } = await supabase.from("membership_roles").delete().eq("membership_id", membershipId).eq("role_id", roleRow.id);
    if (error) {
      log.error({ event: "roster_role_delete_failed", source: "toggleRosterRoleAction", companyId, code: error.code }, error);
      return { status: "error", messageKey: "errRoleUpdateFailed" };
    }
  }

  revalidatePath("/dashboard/companies/roster");
  return { status: "success", messageKey: "okUpdated" };
}
