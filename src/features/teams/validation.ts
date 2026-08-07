import type { TeamActionState, TeamFormValues, TeamStatus } from "./types";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(data: FormData, key: string, max: number) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

/**
 * Returns field error *keys* rather than sentences (#28).
 *
 * Validation runs on the server, which does not reliably know the caller's
 * locale — so the sentence has to be chosen where the locale is known, in the
 * component.
 */
export function validateTeamForm(formData: FormData) {
  const memberIds = formData.getAll("memberIds").filter((value): value is string => typeof value === "string" && value.length > 0);
  const data: TeamFormValues = {
    name: text(formData, "name", 100),
    description: text(formData, "description", 500),
    status: text(formData, "status", 16) as TeamStatus,
    color: text(formData, "color", 7),
    icon: text(formData, "icon", 32),
    leaderMembershipId: text(formData, "leaderMembershipId", 36),
    memberIds,
  };

  const fieldErrors: NonNullable<TeamActionState["fieldErrors"]> = {};
  if (data.name.length < 2) fieldErrors.name = "name";
  if (!["active", "inactive", "archived"].includes(data.status)) fieldErrors.status = "status";
  if (data.color && !/^#[0-9a-f]{6}$/i.test(data.color)) fieldErrors.color = "color";
  if (data.leaderMembershipId && !uuid.test(data.leaderMembershipId)) fieldErrors.leaderMembershipId = "leader";
  if (memberIds.some((id) => !uuid.test(id)) || new Set(memberIds).size !== memberIds.length) fieldErrors.memberIds = "members";

  return Object.keys(fieldErrors).length
    ? { error: { status: "error", messageKey: "reviewFields", fieldErrors } as TeamActionState }
    : { data };
}
