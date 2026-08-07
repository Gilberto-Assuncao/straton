"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { log } from "@/src/infrastructure/observability/logger";
import { validateTeamForm } from "./validation";
import type { TeamActionState, TeamMutationResult, TeamRole } from "./types";

const managerRoles = ["owner", "admin", "administrator", "manager"];

async function context() {
  const result = await requireActiveCompany();
  return { ...result, allowed: result.session.activeCompany!.roles.some((role) => managerRoles.includes(role)) };
}

const denied = (): TeamActionState => ({ status: "error", messageKey: "denied" });

export async function createTeamAction(_: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const ctx = await context();
  if (!ctx.allowed) return denied();
  const validation = validateTeamForm(formData);
  if (!validation.data) return validation.error ?? denied();
  const data = validation.data;
  const members = [...new Set([...data.memberIds, ...(data.leaderMembershipId ? [data.leaderMembershipId] : [])])];

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_team", {
    company_id_input: ctx.companyId, name_input: data.name, description_input: data.description,
    leader_membership_id_input: data.leaderMembershipId || null, status_input: data.status,
    color_input: data.color || null, icon_input: data.icon || null, member_ids_input: members,
  });

  if (error || typeof id !== "string") {
    // The provider's own words used to be returned to the screen. They belong
    // in the log; the user gets a sentence in their own language.
    log.error({ event: "team_create_failed", source: "createTeamAction", companyId: ctx.companyId }, error);
    return { status: "error", messageKey: "teamCreateFailed" };
  }

  revalidatePath("/dashboard/teams");
  redirect(`/dashboard/teams/${id}`);
}

export async function updateTeamAction(teamId: string, _: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const ctx = await context();
  if (!ctx.allowed) return denied();
  const validation = validateTeamForm(formData);
  if (!validation.data) return validation.error ?? denied();
  const data = validation.data;

  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("id").eq("id", teamId).eq("company_id", ctx.companyId).maybeSingle();
  if (!team) return denied();

  const { error } = await supabase.rpc("update_team", {
    team_id_input: teamId, name_input: data.name, description_input: data.description,
    leader_membership_id_input: data.leaderMembershipId || null, status_input: data.status,
    color_input: data.color || null, icon_input: data.icon || null,
  });
  if (error) {
    log.error({ event: "team_update_failed", source: "updateTeamAction", companyId: ctx.companyId }, error);
    return { status: "error", messageKey: "failed" };
  }

  revalidatePath(`/dashboard/teams/${teamId}`);
  revalidatePath("/dashboard/teams");
  return { status: "success", messageKey: "teamUpdated" };
}

export async function addTeamMemberAction(teamId: string, membershipId: string, role: TeamRole): Promise<TeamMutationResult> {
  const ctx = await context();
  if (!ctx.allowed || !["leader", "supervisor", "member"].includes(role)) return { ok: false, messageKey: "denied" };

  const supabase = await createClient();
  const [{ data: team }, { data: membership }, { data: existing }] = await Promise.all([
    supabase.from("teams").select("id,status").eq("id", teamId).eq("company_id", ctx.companyId).maybeSingle(),
    supabase.from("company_memberships").select("id").eq("id", membershipId).eq("company_id", ctx.companyId).eq("status", "active").maybeSingle(),
    supabase.from("team_memberships").select("id").eq("team_id", teamId).eq("company_membership_id", membershipId).is("left_at", null).maybeSingle(),
  ]);

  if (existing) return { ok: false, messageKey: "memberExists" };
  if (!team || team.status === "archived" || !membership) return { ok: false, messageKey: "memberCannotBeAdded" };

  const { error } = await supabase.from("team_memberships").insert({
    company_id: ctx.companyId, team_id: teamId, company_membership_id: membershipId, team_role: role,
  });
  if (error) {
    log.error({ event: "team_member_add_failed", source: "addTeamMemberAction", companyId: ctx.companyId }, error);
    return { ok: false, messageKey: "failed" };
  }

  revalidatePath(`/dashboard/teams/${teamId}`);
  return { ok: true, messageKey: "memberAdded" };
}

export async function removeTeamMemberAction(teamId: string, linkId: string): Promise<TeamMutationResult> {
  const ctx = await context();
  if (!ctx.allowed) return { ok: false, messageKey: "denied" };

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("team_memberships").select("id,team_role")
    .eq("id", linkId).eq("team_id", teamId).eq("company_id", ctx.companyId).is("left_at", null).maybeSingle();

  if (!link) return { ok: false, messageKey: "memberUnavailable" };
  if (link.team_role === "leader") return { ok: false, messageKey: "leaderFirst" };

  const now = new Date().toISOString();
  const { error } = await supabase.from("team_memberships").update({ left_at: now, removed_at: now }).eq("id", linkId);
  if (error) {
    log.error({ event: "team_member_remove_failed", source: "removeTeamMemberAction", companyId: ctx.companyId }, error);
    return { ok: false, messageKey: "failed" };
  }

  revalidatePath(`/dashboard/teams/${teamId}`);
  return { ok: true, messageKey: "memberRemoved" };
}

export async function archiveTeamAction(teamId: string, archived: boolean): Promise<TeamMutationResult> {
  const ctx = await context();
  if (!ctx.allowed) return { ok: false, messageKey: "denied" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ status: archived ? "archived" : "active", archived_at: archived ? new Date().toISOString() : null })
    .eq("id", teamId).eq("company_id", ctx.companyId);

  if (error) {
    log.error({ event: "team_archive_failed", source: "archiveTeamAction", companyId: ctx.companyId }, error);
    return { ok: false, messageKey: "failed" };
  }

  revalidatePath("/dashboard/teams");
  revalidatePath(`/dashboard/teams/${teamId}`);
  return { ok: true, messageKey: archived ? "teamArchived" : "teamReactivated" };
}
