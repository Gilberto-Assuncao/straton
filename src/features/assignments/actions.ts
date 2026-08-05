"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { findAvailabilityConflicts } from "@/src/features/availability/data";
import { WORKER_TRANSITIONS, type AssignmentStatus } from "./types";

export type AssignmentMessageKey =
  | "created"
  | "statusChanged"
  | "deleted"
  | "notAllowed"
  | "missingTitle"
  | "missingDates"
  | "endBeforeStart"
  | "noAssignees"
  | "emptyTeam"
  | "invalidTransition"
  | "failed";

export type AssignmentResult =
  | { ok: true; message: AssignmentMessageKey; warnings: ConflictWarning[] }
  | { ok: false; message: AssignmentMessageKey };

/**
 * Someone booked onto work they had already declared themselves away from.
 *
 * A warning and not a refusal: sometimes the holiday is cancelled, sometimes
 * the person volunteers, and a supervisor who knows something the system does
 * not should never be stopped by it. What must not happen is booking blind —
 * which is what the whole availability feature exists to prevent.
 */
export interface ConflictWarning {
  name: string;
  reason: string | null;
  startsAt: string;
  endsAt: string;
}

const MANAGER_ROLES = ["owner", "admin", "administrator", "manager", "supervisor"];

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createAssignmentAction(formData: FormData): Promise<AssignmentResult> {
  const { companyId, session } = await requireActiveCompany();
  const membership = session.activeCompany;
  if (!membership?.roles.some((role) => MANAGER_ROLES.includes(role))) {
    return { ok: false, message: "notAllowed" };
  }

  const title = text(formData, "title");
  if (title.length < 2) return { ok: false, message: "missingTitle" };

  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");
  if (!startsAt || !endsAt) return { ok: false, message: "missingDates" };
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ok: false, message: "missingDates" };
  if (end <= start) return { ok: false, message: "endBeforeStart" };

  const teamId = text(formData, "teamId") || null;
  const directIds = formData.getAll("assigneeIds").map(String).filter(Boolean);

  const supabase = await createClient();

  /**
   * Expand the team into people, once, now.
   *
   * Not computed when someone opens the screen: work it out live and a person
   * who leaves the team tomorrow vanishes retroactively from the work they did
   * yesterday, and the timesheet stops agreeing with who was on site. Belgian
   * compliance needs a record of who was assigned on the day.
   */
  let teamMemberIds: string[] = [];
  if (teamId) {
    const { data: members } = await supabase
      .from("team_memberships")
      .select("company_membership_id")
      .eq("team_id", teamId)
      .eq("company_id", companyId)
      // Both, because the table carries two ways of having gone: `left_at` for
      // someone who moved on, `removed_at` for someone taken off. Miss either
      // and booking "Solar Team" quietly drags in people who are not on it.
      .is("left_at", null)
      .is("removed_at", null);
    teamMemberIds = ((members ?? []) as { company_membership_id: string }[]).map((row) => row.company_membership_id);
    // An empty team is almost always a mistake, and it would create an
    // assignment with nobody on it that still looks scheduled.
    if (teamMemberIds.length === 0) return { ok: false, message: "emptyTeam" };
  }

  // Direct picks win over the team expansion when someone appears in both, so
  // the person is recorded once, as deliberately chosen.
  const bySource = new Map<string, "direct" | "team">();
  for (const id of teamMemberIds) bySource.set(id, "team");
  for (const id of directIds) bySource.set(id, "direct");
  if (bySource.size === 0) return { ok: false, message: "noAssignees" };

  const siteId = text(formData, "siteId") || null;
  let projectId = text(formData, "projectId") || null;
  if (siteId && !projectId) {
    const { data: site } = await supabase.from("sites").select("project_id").eq("id", siteId).maybeSingle();
    projectId = (site as { project_id: string | null } | null)?.project_id ?? null;
  }

  const { data: created, error } = await supabase
    .from("assignments")
    .insert({
      company_id: companyId,
      project_id: projectId,
      site_id: siteId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      title,
      instructions: text(formData, "instructions") || null,
      team_id: teamId,
      created_by: session.user.id,
      status: "sent",
    })
    .select("id")
    .single();

  if (error || !created) return { ok: false, message: "failed" };

  const rows = [...bySource.entries()].map(([membershipId, source]) => ({
    company_id: companyId,
    assignment_id: (created as { id: string }).id,
    company_membership_id: membershipId,
    source,
  }));

  const { error: assigneeError } = await supabase.from("assignment_assignees").insert(rows);
  if (assigneeError) {
    // Without this the assignment survives with nobody on it — scheduled work
    // that no one was ever told about, which is worse than no assignment.
    await supabase.from("assignments").delete().eq("id", (created as { id: string }).id);
    return { ok: false, message: "failed" };
  }

  const warnings = await conflictWarnings([...bySource.keys()], start.toISOString(), end.toISOString());

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "created", warnings };
}

/** Turns membership ids into names, so the warning names people rather than uuids. */
async function conflictWarnings(
  membershipIds: string[],
  startsAt: string,
  endsAt: string,
): Promise<ConflictWarning[]> {
  const conflicts = await findAvailabilityConflicts(membershipIds, startsAt, endsAt);
  if (conflicts.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("company_memberships")
    .select("id,users!company_memberships_user_id_fkey(name)")
    .in(
      "id",
      conflicts.map((conflict) => conflict.membershipId),
    );

  type Row = { id: string; users: { name: string } | { name: string }[] | null };
  const names = new Map(
    ((data ?? []) as Row[]).map((row) => [row.id, (Array.isArray(row.users) ? row.users[0] : row.users)?.name ?? ""]),
  );

  return conflicts.map((conflict) => ({
    name: names.get(conflict.membershipId) ?? "",
    reason: conflict.reason,
    startsAt: conflict.startsAt,
    endsAt: conflict.endsAt,
  }));
}

export async function changeAssignmentStatusAction(
  assignmentId: string,
  status: AssignmentStatus,
): Promise<AssignmentResult> {
  const { session } = await requireActiveCompany();
  const isManager = Boolean(session.activeCompany?.roles.some((role) => MANAGER_ROLES.includes(role)));

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("assignments")
    .select("status")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!current) return { ok: false, message: "failed" };

  // A manager may set any status; everyone else follows the ladder. Checked
  // here as well as in the trigger so the refusal says which move was illegal
  // rather than surfacing a raw database error.
  const from = (current as { status: AssignmentStatus }).status;
  if (!isManager && !WORKER_TRANSITIONS[from].includes(status)) {
    return { ok: false, message: "invalidTransition" };
  }

  const { error } = await supabase.from("assignments").update({ status }).eq("id", assignmentId);
  if (error) return { ok: false, message: "failed" };

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "statusChanged", warnings: [] };
}

export async function deleteAssignmentAction(assignmentId: string): Promise<AssignmentResult> {
  const { session } = await requireActiveCompany();
  if (!session.activeCompany?.roles.some((role) => MANAGER_ROLES.includes(role))) {
    return { ok: false, message: "notAllowed" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) return { ok: false, message: "failed" };

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "deleted", warnings: [] };
}
