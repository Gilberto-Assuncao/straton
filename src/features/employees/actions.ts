"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { log } from "@/src/infrastructure/observability/logger";

export type InviteEmployeeState = { status: "idle" | "error"; message: string };

const managerRoles = ["owner", "admin", "administrator", "manager"];
const roleKeyByEmploymentType: Record<string, string> = { employee: "employee", contractor: "contractor", temporary: "employee" };

export async function inviteEmployeeAction(_: InviteEmployeeState, formData: FormData): Promise<InviteEmployeeState> {
  const { session, companyId } = await requireActiveCompany();
  const isManager = session.activeCompany!.roles.some((role) => managerRoles.includes(role));
  if (!isManager) return { status: "error", message: "You do not have permission to invite employees." };

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
    return { status: "error", message: "Fill in all required fields." };
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
  if (team && !teamRow) return { status: "error", message: "Select a valid team." };
  if (!roleRow) return { status: "error", message: "Unable to resolve the employee role." };

  let userId = existingUser?.id as string | undefined;
  if (userId) {
    const { data: existingMembership } = await admin.from("company_memberships").select("id").eq("company_id", companyId).eq("user_id", userId).maybeSingle();
    if (existingMembership) return { status: "error", message: "This person is already part of your company." };
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
      return { status: "error", message: "Could not send the invitation email. It has been logged; try again shortly." };
    }
    userId = invited.user.id;
    await admin.from("users").update({ first_name: firstName, last_name: lastName, phone: phone || null }).eq("id", userId);
  }

  const { data: membership, error: membershipError } = await admin
    .from("company_memberships")
    .insert({ company_id: companyId, user_id: userId, job_title: jobTitle, status: "invited", pending_team_id: teamRow?.id ?? null })
    .select("id")
    .single();
  if (membershipError || !membership) return { status: "error", message: membershipError?.message ?? "Unable to create the membership." };

  const { error: roleError } = await admin.from("membership_roles").insert({ membership_id: membership.id, role_id: roleRow.id });
  if (roleError) return { status: "error", message: roleError.message };

  const { error: recordError } = await admin.from("employee_records").insert({
    company_id: companyId, company_membership_id: membership.id, job_title: jobTitle,
    employment_type: employmentType, employment_status: "pending", start_date: startDate,
  });
  if (recordError) return { status: "error", message: recordError.message };

  // Team assignment happens once the invite is accepted (acceptInviteAction
  // below) — validate_team_operational_membership requires the membership to
  // already be 'active' before it can join a team, so it's stored on
  // pending_team_id above and applied later, not here.

  revalidatePath("/dashboard/employees");
  redirect("/dashboard/employees");
}

export type AcceptInviteState = { status: "idle" | "error" | "success"; message: string };

export async function acceptInviteAction(_: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const password = String(formData.get("password") ?? "");
  const accessToken = String(formData.get("accessToken") ?? "");
  if (password.length < 8) return { status: "error", message: "Password must be at least 8 characters." };
  if (!accessToken) return { status: "error", message: "Your invite link has expired. Ask for a new one." };

  // Invite links deliver the session via a URL fragment (#access_token=...)
  // that only the browser can read, and @supabase/ssr's cookie sync doesn't
  // reliably pick up a session recovered that way (confirmed by testing: the
  // server kept seeing whoever was already logged in in that browser, not
  // the invitee — once nearly overwriting an admin's own password). The
  // client passes the token explicitly instead, verified here directly
  // against GoTrue rather than trusted from cookies.
  const admin = createAdminClient();
  const { data: tokenUser, error: tokenError } = await admin.auth.getUser(accessToken);
  if (tokenError || !tokenUser.user) return { status: "error", message: "Your invite link has expired. Ask for a new one." };
  const user = tokenUser.user;

  const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, { password });
  if (passwordError) return { status: "error", message: passwordError.message };

  const { data: memberships, error: fetchError } = await admin
    .from("company_memberships")
    .select("id,company_id,pending_team_id")
    .eq("user_id", user.id)
    .eq("status", "invited");
  if (fetchError) return { status: "error", message: fetchError.message };

  for (const membership of memberships ?? []) {
    const { error: activateError } = await admin
      .from("company_memberships")
      .update({ status: "active", starts_at: new Date().toISOString(), pending_team_id: null })
      .eq("id", membership.id);
    if (activateError) return { status: "error", message: activateError.message };

    if (membership.pending_team_id) {
      await admin.from("team_memberships").insert({
        company_id: membership.company_id, team_id: membership.pending_team_id,
        company_membership_id: membership.id, team_role: "member",
      });
    }
  }

  return { status: "success", message: "Account activated." };
}

export type UpdateEmployeeState = { status: "idle" | "error"; message: string };

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
  const { session, companyId } = await requireActiveCompany();
  if (!session.activeCompany!.roles.some((role) => managerRoles.includes(role))) {
    return { status: "error", message: "You do not have permission to edit employees." };
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
    return { status: "error", message: "Fill in all required fields." };
  }

  const target = await loadEditableEmployee(employeeId, companyId);
  if (!target) return { status: "error", message: "Employee not found." };

  const admin = createAdminClient();
  const supabase = await createClient();

  const { error: userError } = await admin
    .from("users")
    .update({ first_name: firstName, last_name: lastName, phone: phone || null })
    .eq("id", target.userId);
  if (userError) return { status: "error", message: userError.message };

  const { error: membershipError } = await admin
    .from("company_memberships")
    .update({ job_title: jobTitle })
    .eq("id", target.membershipId);
  if (membershipError) return { status: "error", message: membershipError.message };

  const { error: recordError } = await admin
    .from("employee_records")
    .update({ job_title: jobTitle, employment_type: employmentType, start_date: startDate })
    .eq("id", target.recordId);
  if (recordError) return { status: "error", message: recordError.message };

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
  if (team && !teamRow) return { status: "error", message: "Select a valid team." };

  const { data: currentLink } = await supabase
    .from("team_memberships")
    .select("id,team_id,team_role")
    .eq("company_membership_id", target.membershipId)
    .is("left_at", null)
    .maybeSingle();

  if ((currentLink?.team_id ?? null) !== (teamRow?.id ?? null)) {
    if (currentLink?.team_role === "leader") {
      return { status: "error", message: "This person leads their current team. Assign another leader before moving them." };
    }
    if (currentLink) {
      const now = new Date().toISOString();
      const { error } = await admin.from("team_memberships").update({ left_at: now, removed_at: now }).eq("id", currentLink.id);
      if (error) return { status: "error", message: error.message };
    }
    // Only active memberships may join a team (enforced by
    // validate_team_operational_membership); invited people keep the team on
    // pending_team_id until they accept.
    if (teamRow && target.membershipStatus === "active") {
      const { error } = await admin.from("team_memberships").insert({
        company_id: companyId, team_id: teamRow.id,
        company_membership_id: target.membershipId, team_role: "member",
      });
      if (error) return { status: "error", message: error.message };
    } else {
      const { error } = await admin.from("company_memberships").update({ pending_team_id: teamRow?.id ?? null }).eq("id", target.membershipId);
      if (error) return { status: "error", message: error.message };
    }
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);
  redirect(`/dashboard/employees/${employeeId}`);
}

// Deactivation suspends the membership and closes the team link, keeping every
// past timesheet, assignment and team record intact. Reactivation is included
// deliberately: a one-way switch would strand people with no route back.
export async function setEmployeeActiveAction(employeeId: string, active: boolean): Promise<{ ok: boolean; message: string }> {
  const { session, companyId } = await requireActiveCompany();
  if (!session.activeCompany!.roles.some((role) => managerRoles.includes(role))) {
    return { ok: false, message: "You do not have permission to change employee status." };
  }

  const target = await loadEditableEmployee(employeeId, companyId);
  if (!target) return { ok: false, message: "Employee not found." };
  if (target.userId === session.user.id) return { ok: false, message: "You cannot deactivate your own account." };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { error: membershipError } = await admin
    .from("company_memberships")
    .update(active ? { status: "active", ends_at: null } : { status: "suspended", ends_at: now })
    .eq("id", target.membershipId);
  if (membershipError) return { ok: false, message: membershipError.message };

  const { error: recordError } = await admin
    .from("employee_records")
    .update({ employment_status: active ? "active" : "inactive" })
    .eq("id", target.recordId);
  if (recordError) return { ok: false, message: recordError.message };

  if (!active) {
    await admin.from("team_memberships").update({ left_at: now, removed_at: now })
      .eq("company_membership_id", target.membershipId).is("left_at", null);
  }

  revalidatePath("/dashboard/employees");
  revalidatePath(`/dashboard/employees/${employeeId}`);
  return { ok: true, message: active ? "Employee reactivated." : "Employee deactivated; history was preserved." };
}
