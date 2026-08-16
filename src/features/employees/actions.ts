"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { log } from "@/src/infrastructure/observability/logger";
import type { EmployeeMessageKey } from "./messages";
import type { AuthActionState } from "@/app/[locale]/auth/state";

/**
 * `values` is what was typed, echoed back with the refusal (#74).
 *
 * Nine fields, all of them lost on every refusal until now — including the
 * start date and the hourly rate, which are the two nobody has memorised.
 */
export type InviteEmployeeState = {
  status: "idle" | "error";
  /** null while idle. A key into `employees`, never a sentence (#104). */
  messageKey: EmployeeMessageKey | null;
  values?: Record<string, string>;
};

/**
 * Every field this form posts, listed rather than derived.
 *
 * The list is the point. An earlier attempt at this put `values` on every
 * error return in the file with one substitution, and it also reached
 * `acceptInviteAction` — which sets a password from an invite link, and must
 * never echo anything back. A named list per action cannot do that.
 */
const INVITE_FIELDS = [
  "firstName", "lastName", "email", "phone", "jobTitle",
  "team", "employmentType", "hourlyRate", "startDate",
] as const;

function submittedInvite(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of INVITE_FIELDS) values[key] = String(formData.get(key) ?? "");
  return values;
}

const managerRoles = ["owner", "admin", "administrator", "manager"];
const roleKeyByEmploymentType: Record<string, string> = { employee: "employee", contractor: "contractor", temporary: "employee" };

export async function inviteEmployeeAction(_: InviteEmployeeState, formData: FormData): Promise<InviteEmployeeState> {
  const values = submittedInvite(formData);
  const { session, companyId } = await requireActiveCompany();
  const isManager = session.activeCompany!.roles.some((role) => managerRoles.includes(role));
  if (!isManager) return { status: "error", messageKey: "errNoPermissionInvite", values };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "employee");
  const startDate = String(formData.get("startDate") ?? "");

  // Team is deliberately not required (#45).
  //
  // The membership is what makes someone exist and lets them clock in; the team
  // is internal organisation, it changes often, and it is frequently not
  // decided on the day someone is hired. Forcing it here made whoever was
  // hiring invent a team to get past the form, and data invented to satisfy a
  // validator is worse than a blank. `pending_team_id` has always been
  // nullable, and the workforce screen already renders "Unassigned" — only the
  // form insisted.
  if (!firstName || !lastName || !email || !jobTitle || !startDate) {
    return { status: "error", messageKey: "errRequiredFields", values };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: teamRow }, { data: roleRow }, { data: existingUser }] = await Promise.all([
    team
      ? supabase.from("teams").select("id").eq("company_id", companyId).eq("name", team).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("roles").select("id").eq("key", roleKeyByEmploymentType[employmentType] ?? "employee").maybeSingle(),
    admin.from("users").select("id").eq("email", email).maybeSingle(),
  ]);
  // A team that was named but does not exist is still an error — that is a
  // typo or a stale form, not a choice. Naming none is the choice.
  if (team && !teamRow) return { status: "error", messageKey: "errInvalidTeam", values };
  if (!roleRow) return { status: "error", messageKey: "errRoleUnresolved", values };

  let userId = existingUser?.id as string | undefined;
  if (userId) {
    const { data: existingMembership } = await admin.from("company_memberships").select("id").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
    if (existingMembership) return { status: "error", messageKey: "errAlreadyInCompany", values };
    await admin.from("users").update({ first_name: firstName, last_name: lastName, phone: phone || null }).eq("id", userId);
  } else {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: `${firstName} ${lastName}` },
      // Admin-generated links (invite/magic-link/recovery) can't use PKCE —
      // that requires the same browser to both start and finish the flow,
      // which is impossible when the link is emailed to someone else's
      // browser. GoTrue instead delivers tokens in the URL fragment, which
      // only client-side JS can read, so this must NOT route through the
      // server-side /auth/callback (?code=) handler.
      redirectTo: `${appUrl}/accept-invite`,
    });
    if (inviteError || !invited.user) {
      // The path that opened #27. When the SMTP credentials were wrong this
      // returned `535 5.7.8 Authentication failed` — or, when the provider sent
      // an empty body, the literal string `{}` — straight onto the screen, and
      // nowhere else. The detail belongs in the log; the person inviting gets
      // something they can act on.
      log.error(
        { event: "invite_email_failed", source: "inviteEmployeeAction", companyId, userId: session.user.id },
        inviteError,
      );
      return { status: "error", messageKey: "errInviteEmailFailed", values };
    }
    userId = invited.user.id;
    await admin.from("users").update({ first_name: firstName, last_name: lastName, phone: phone || null }).eq("id", userId);
  }

  const { data: membership, error: membershipError } = await admin
    .from("company_memberships")
    .insert({ company_id: companyId, user_id: userId, job_title: jobTitle, status: "invited", pending_team_id: teamRow?.id ?? null })
    .select("id")
    .single();
  if (membershipError || !membership) {
    log.error({ event: "membership_insert_failed", source: "inviteEmployeeAction", companyId, code: membershipError?.code }, membershipError);
    return { status: "error", messageKey: "errInviteSaveFailed", values };
  }

  const { error: roleError } = await admin.from("membership_roles").insert({ membership_id: membership.id, role_id: roleRow.id });
  if (roleError) {
    log.error({ event: "membership_role_insert_failed", source: "inviteEmployeeAction", companyId, code: roleError.code }, roleError);
    return { status: "error", messageKey: "errInviteSaveFailed", values };
  }

  const { error: recordError } = await admin.from("employee_records").insert({
    company_id: companyId, company_membership_id: membership.id, job_title: jobTitle,
    employment_type: employmentType, employment_status: "pending", start_date: startDate,
  });
  if (recordError) {
    log.error({ event: "employee_record_insert_failed", source: "inviteEmployeeAction", companyId, code: recordError.code }, recordError);
    return { status: "error", messageKey: "errInviteSaveFailed", values };
  }

  // Team assignment happens once the invite is accepted (acceptInviteAction
  // below) — validate_team_operational_membership requires the membership to
  // already be 'active' before it can join a team, so it's stored on
  // pending_team_id above and applied later, not here.

  revalidatePath("/dashboard/employees");
  redirect("/dashboard/employees");
}

/**
 * The same state the rest of the auth screens use, aliased rather than copied.
 *
 * It *was* a copy — `{ status; message: string }` — and on 26 July `AuthStatus`
 * moved to `messageKey` while this stayed behind. Structural typing let the old
 * shape keep satisfying the component's prop, so nothing failed to compile and
 * no test noticed: `AuthStatus` simply found no `messageKey` and returned null.
 * From that day until now, somebody accepting an invitation with a short
 * password watched the button do nothing at all, with no message.
 *
 * An alias is the fix, not a second field. Two types describing one screen is
 * what let them drift apart silently in the first place.
 */
export type AcceptInviteState = AuthActionState;

export async function acceptInviteAction(_: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const password = String(formData.get("password") ?? "");
  const accessToken = String(formData.get("accessToken") ?? "");
  if (password.length < 8) return { status: "error", messageKey: "errPasswordTooShort" };
  if (!accessToken) return { status: "error", messageKey: "errInviteExpired" };

  // Invite links deliver the session via a URL fragment (#access_token=...)
  // that only the browser can read, and @supabase/ssr's cookie sync doesn't
  // reliably pick up a session recovered that way (confirmed by testing: the
  // server kept seeing whoever was already logged in in that browser, not
  // the invitee — once nearly overwriting an admin's own password). The
  // client passes the token explicitly instead, verified here directly
  // against GoTrue rather than trusted from cookies.
  const admin = createAdminClient();
  const { data: tokenUser, error: tokenError } = await admin.auth.getUser(accessToken);
  if (tokenError || !tokenUser.user) return { status: "error", messageKey: "errInviteExpired" };
  const user = tokenUser.user;

  const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, { password });
  if (passwordError) {
    log.error({ event: "invite_password_set_failed", source: "acceptInviteAction", userId: user.id }, passwordError);
    return { status: "error", messageKey: "errActivationFailed" };
  }

  const { data: memberships, error: fetchError } = await admin
    .from("company_memberships")
    .select("id,company_id,pending_team_id")
    .eq("user_id", user.id)
    .eq("status", "invited");
  if (fetchError) {
    log.error({ event: "invite_memberships_read_failed", source: "acceptInviteAction", userId: user.id, code: fetchError.code }, fetchError);
    return { status: "error", messageKey: "errActivationFailed" };
  }

  for (const membership of memberships ?? []) {
    const { error: activateError } = await admin
      .from("company_memberships")
      .update({ status: "active", starts_at: new Date().toISOString(), pending_team_id: null })
      .eq("id", membership.id);
    if (activateError) {
      log.error({ event: "membership_activate_failed", source: "acceptInviteAction", userId: user.id, code: activateError.code }, activateError);
      return { status: "error", messageKey: "errActivationFailed" };
    }

    if (membership.pending_team_id) {
      await admin.from("team_memberships").insert({
        company_id: membership.company_id, team_id: membership.pending_team_id,
        company_membership_id: membership.id, team_role: "member",
      });
    }
  }

  return { status: "success", messageKey: "okAccountActivated" };
}

export type UpdateEmployeeState = {
  status: "idle" | "error";
  /** null while idle. A key into `employees`, never a sentence (#104). */
  messageKey: EmployeeMessageKey | null;
  /** What was typed, echoed back with the refusal (#74). */
  values?: Record<string, string>;
};

/** Named per action, never derived — see the note on `INVITE_FIELDS`. */
const UPDATE_FIELDS = [
  "firstName", "lastName", "phone", "jobTitle",
  "team", "employmentType", "startDate",
] as const;

function submittedUpdate(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of UPDATE_FIELDS) values[key] = String(formData.get(key) ?? "");
  return values;
}

// The employee id used across the UI is `employee_records.id`. Editing one
// person touches three tables — the person (`users`), their place in the
// company (`company_memberships`) and their employment terms
// (`employee_records`) — so everything is resolved from that single id here.
async function loadEditableEmployee(employeeId: string, companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("employee_records")
    .select("id,company_membership_id,company_memberships!employee_records_company_membership_id_fkey(id,user_id,status)")
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data) return null;
  const membership = Array.isArray(data.company_memberships) ? data.company_memberships[0] : data.company_memberships;
  if (!membership) return null;
  return { recordId: data.id as string, membershipId: membership.id as string, userId: membership.user_id as string, membershipStatus: membership.status as string };
}

export async function updateEmployeeAction(_: UpdateEmployeeState, formData: FormData): Promise<UpdateEmployeeState> {
  const values = submittedUpdate(formData);
  const { session, companyId } = await requireActiveCompany();
  if (!session.activeCompany!.roles.some((role) => managerRoles.includes(role))) {
    return { status: "error", messageKey: "errNoPermissionEdit", values };
  }

  const employeeId = String(formData.get("employeeId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "employee");
  const startDate = String(formData.get("startDate") ?? "");

  if (!firstName || !lastName || !jobTitle || !startDate) {
    return { status: "error", messageKey: "errRequiredFields", values };
  }

  const target = await loadEditableEmployee(employeeId, companyId);
  if (!target) return { status: "error", messageKey: "errEmployeeNotFound", values };

  const admin = createAdminClient();
  const supabase = await createClient();

  const { error: userError } = await admin
    .from("users")
    .update({ first_name: firstName, last_name: lastName, phone: phone || null })
    .eq("id", target.userId);
  if (userError) {
    log.error({ event: "employee_user_update_failed", source: "updateEmployeeAction", companyId, code: userError.code }, userError);
    return { status: "error", messageKey: "errEmployeeSaveFailed", values };
  }

  const { error: membershipError } = await admin
    .from("company_memberships")
    .update({ job_title: jobTitle })
    .eq("id", target.membershipId);
  if (membershipError) {
    log.error({ event: "employee_membership_update_failed", source: "updateEmployeeAction", companyId, code: membershipError.code }, membershipError);
    return { status: "error", messageKey: "errEmployeeSaveFailed", values };
  }

  const { error: recordError } = await admin
    .from("employee_records")
    .update({ job_title: jobTitle, employment_type: employmentType, start_date: startDate })
    .eq("id", target.recordId);
  if (recordError) {
    log.error({ event: "employee_record_update_failed", source: "updateEmployeeAction", companyId, code: recordError.code }, recordError);
    return { status: "error", messageKey: "errEmployeeSaveFailed", values };
  }

  /*
   * Team moves close the current link instead of deleting it, so the history of
   * who was on which team stays intact for payroll and compliance.
   *
   * An empty team means "no team", which is a decision and not a missing field
   * (#45). It used to be unreachable: the edit form offered the placeholder
   * "Unassigned" as though it were a team, this looked it up by name, found
   * nothing, and answered "Select a valid team" — so anybody without a team
   * could not be edited at all, whatever they were trying to change.
   */
  const { data: teamRow } = team
    ? await supabase.from("teams").select("id").eq("company_id", companyId).eq("name", team).maybeSingle()
    : { data: null };
  // Named but non-existent is still an error: that is a typo or a stale form.
  if (team && !teamRow) return { status: "error", messageKey: "errInvalidTeam", values };

  const { data: currentLink } = await supabase
    .from("team_memberships")
    .select("id,team_id,team_role")
    .eq("company_membership_id", target.membershipId)
    .is("left_at", null)
    .maybeSingle();

  if ((currentLink?.team_id ?? null) !== (teamRow?.id ?? null)) {
    if (currentLink?.team_role === "leader") {
      return { status: "error", messageKey: "errLeadsTheirTeam", values };
    }
    if (currentLink) {
      const now = new Date().toISOString();
      const { error } = await admin.from("team_memberships").update({ left_at: now, removed_at: now }).eq("id", currentLink.id);
      if (error) {
        log.error({ event: "team_link_close_failed", source: "updateEmployeeAction", companyId, code: error.code }, error);
        return { status: "error", messageKey: "errTeamMoveFailed", values };
      }
    }
    // Only active memberships may join a team (enforced by
    // validate_team_operational_membership); invited people keep the team on
    // pending_team_id until they accept.
    if (teamRow && target.membershipStatus === "active") {
      const { error } = await admin.from("team_memberships").insert({
        company_id: companyId, team_id: teamRow.id,
        company_membership_id: target.membershipId, team_role: "member",
      });
      if (error) {
        log.error({ event: "team_link_open_failed", source: "updateEmployeeAction", companyId, code: error.code }, error);
        return { status: "error", messageKey: "errTeamMoveFailed", values };
      }
    } else {
      const { error } = await admin.from("company_memberships").update({ pending_team_id: teamRow?.id ?? null }).eq("id", target.membershipId);
      if (error) {
        log.error({ event: "pending_team_update_failed", source: "updateEmployeeAction", companyId, code: error.code }, error);
        return { status: "error", messageKey: "errTeamMoveFailed", values };
      }
    }
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);
  redirect(`/dashboard/employees/${employeeId}`);
}

// Deactivation suspends the membership and closes the team link, keeping every
// past timesheet, assignment and team record intact. Reactivation is included
// deliberately: a one-way switch would strand people with no route back.
export async function setEmployeeActiveAction(employeeId: string, active: boolean): Promise<{ ok: boolean; messageKey: EmployeeMessageKey }> {
  const { session, companyId } = await requireActiveCompany();
  if (!session.activeCompany!.roles.some((role) => managerRoles.includes(role))) {
    return { ok: false, messageKey: "errNoPermissionStatus" };
  }

  const target = await loadEditableEmployee(employeeId, companyId);
  if (!target) return { ok: false, messageKey: "errEmployeeNotFound" };
  if (target.userId === session.user.id) return { ok: false, messageKey: "errCannotDeactivateSelf" };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: membershipError } = await admin
    .from("company_memberships")
    .update(active ? { status: "active", ends_at: null } : { status: "suspended", ends_at: now })
    .eq("id", target.membershipId);
  if (membershipError) {
    log.error({ event: "employee_status_membership_failed", source: "setEmployeeActiveAction", companyId, code: membershipError.code }, membershipError);
    return { ok: false, messageKey: "errStatusChangeFailed" };
  }

  const { error: recordError } = await admin
    .from("employee_records")
    .update({ employment_status: active ? "active" : "inactive" })
    .eq("id", target.recordId);
  if (recordError) {
    log.error({ event: "employee_status_record_failed", source: "setEmployeeActiveAction", companyId, code: recordError.code }, recordError);
    return { ok: false, messageKey: "errStatusChangeFailed" };
  }

  if (!active) {
    await admin.from("team_memberships").update({ left_at: now, removed_at: now })
      .eq("company_membership_id", target.membershipId).is("left_at", null);
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);
  return { ok: true, messageKey: active ? "okEmployeeReactivated" : "okEmployeeDeactivated" };
}
