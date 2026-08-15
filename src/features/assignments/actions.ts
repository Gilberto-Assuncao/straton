"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { findAvailabilityConflicts } from "@/src/features/availability/data";
import { notify } from "@/src/features/notifications/publish";
import { WORKER_TRANSITIONS, type AssignmentStatus } from "./types";

export type AssignmentMessageKey =
  | "created"
  | "rescheduled"
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

  const { data: created, error } = await supabase
    .from("assignments")
    .insert({
      company_id: companyId,
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

  // The channel we control (#49). Until now a worker had no way of learning
  // they had been given a job except by opening the agenda and looking.
  await notify(await recipients(companyId, [...bySource.keys()]), "assignmentAssigned", {
    title,
    startsAt: start.toISOString(),
  });

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "created", warnings };
}

/**
 * Turns membership ids into the user ids a notification is addressed to.
 *
 * Runs before the change in the delete case, because afterwards the rows that
 * say who to tell are gone.
 */
async function recipients(companyId: string, membershipIds: string[]) {
  if (membershipIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("company_memberships").select("user_id").in("id", membershipIds);
  return ((data ?? []) as { user_id: string }[]).map((row) => ({ userId: row.user_id, companyId }));
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

/**
 * Moving a scheduled job (#49).
 *
 * The action the agenda was missing. A supervisor could create work, mark it
 * along and delete it — but not change when or where it happened, which is the
 * one thing that most needs to reach the people on it.
 *
 * Notifies only on what actually changed. Re-saving a form without touching
 * anything should not tell four people their day moved: an alert that fires
 * when nothing happened is how people learn to ignore alerts.
 */
export async function rescheduleAssignmentAction(formData: FormData): Promise<AssignmentResult> {
  const { companyId, session } = await requireActiveCompany();
  if (!session.activeCompany?.roles.some((role) => MANAGER_ROLES.includes(role))) {
    return { ok: false, message: "notAllowed" };
  }

  const assignmentId = text(formData, "assignmentId");
  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");
  if (!assignmentId) return { ok: false, message: "failed" };
  if (!startsAt || !endsAt) return { ok: false, message: "missingDates" };

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { ok: false, message: "missingDates" };
  if (end <= start) return { ok: false, message: "endBeforeStart" };

  const siteId = text(formData, "siteId") || null;
  const supabase = await createClient();

  // Read the old values first: the notification has to say what it moved *from*,
  // and after the update that is gone.
  const { data: before } = await supabase
    .from("assignments")
    .select("title,starts_at,site_id")
    .eq("id", assignmentId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!before) return { ok: false, message: "failed" };

  const previous = before as { title: string; starts_at: string; site_id: string | null };

  const { error } = await supabase
    .from("assignments")
    .update({ starts_at: start.toISOString(), ends_at: end.toISOString(), site_id: siteId })
    .eq("id", assignmentId)
    .eq("company_id", companyId);
  if (error) return { ok: false, message: "failed" };

  const { data: crew } = await supabase
    .from("assignment_assignees")
    .select("company_membership_id")
    .eq("assignment_id", assignmentId);
  const membershipIds = ((crew ?? []) as { company_membership_id: string }[]).map((row) => row.company_membership_id);
  const targets = await recipients(companyId, membershipIds);

  const timeMoved = new Date(previous.starts_at).getTime() !== start.getTime();
  const siteMoved = (previous.site_id ?? null) !== siteId;

  if (timeMoved) {
    await notify(targets, "assignmentTimeChanged", {
      title: previous.title,
      startsAt: start.toISOString(),
      previousStartsAt: previous.starts_at,
    });
  }
  if (siteMoved) {
    const { data: site } = siteId
      ? await supabase.from("sites").select("name").eq("id", siteId).maybeSingle()
      : { data: null };
    await notify(targets, "assignmentSiteChanged", {
      title: previous.title,
      siteName: (site as { name: string } | null)?.name ?? "",
    });
  }

  // Availability is checked again on the new dates. Someone who was free at
  // 07:30 may not be free at 09:00, and the warning is the whole reason the
  // supervisor is not booking blind.
  const warnings = timeMoved ? await conflictWarnings(membershipIds, start.toISOString(), end.toISOString()) : [];

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "rescheduled", warnings };
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

  // Read the crew before deleting: afterwards the rows that say who to tell are
  // gone, and a cancellation nobody hears about is the failure mode that sends
  // someone to a site for work that is no longer happening.
  const [{ data: assignment }, { data: crew }] = await Promise.all([
    supabase.from("assignments").select("title,starts_at,company_id").eq("id", assignmentId).maybeSingle(),
    supabase.from("assignment_assignees").select("company_membership_id").eq("assignment_id", assignmentId),
  ]);

  const { error } = await supabase.from("assignments").delete().eq("id", assignmentId);
  if (error) return { ok: false, message: "failed" };

  const job = assignment as { title: string; starts_at: string; company_id: string } | null;
  if (job) {
    await notify(
      await recipients(job.company_id, ((crew ?? []) as { company_membership_id: string }[]).map((row) => row.company_membership_id)),
      "assignmentCancelled",
      { title: job.title, startsAt: job.starts_at },
    );
  }

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "deleted", warnings: [] };
}
