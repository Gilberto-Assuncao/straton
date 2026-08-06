export type TeamStatus="active"|"inactive"|"archived";
export type TeamRole="leader"|"supervisor"|"member";
export type TeamPermission="view"|"manage"|"archive";
export interface TeamMember { id:string; membershipId:string; name:string; email:string; jobTitle:string; role:TeamRole; joinedAt:string; }
export interface AvailableMember { membershipId:string; name:string; email:string; jobTitle:string; }
export interface TeamSummary { id:string; name:string; description:string; status:TeamStatus; color:string; icon:string; leaderName:string|null; memberCount:number; updatedAt:string; }
export interface TeamDetails extends TeamSummary { companyId:string; companyName:string; leaderMembershipId:string|null; createdAt:string; permissions:TeamPermission[]; members:TeamMember[]; availableMembers:AvailableMember[]; }
export interface TeamFormValues { name:string; description:string; status:TeamStatus; color:string; icon:string; leaderMembershipId:string; memberIds:string[]; }
/**
 * Message keys, never sentences (#28).
 *
 * A server action cannot know the caller's locale reliably, so returning
 * "Team updated." bakes English into a response the interface then has no way
 * to translate. The action names the outcome; the component looks it up.
 * Same rule as AuthMessageKey in app/[locale]/auth/state.ts.
 */
export type TeamMessageKey =
  | "denied"
  | "teamCreateFailed"
  | "teamUpdated"
  | "memberAdded"
  | "memberRemoved"
  | "memberUnavailable"
  | "memberExists"
  | "memberCannotBeAdded"
  | "leaderFirst"
  | "teamArchived"
  | "teamReactivated"
  | "reviewFields"
  | "failed";

/** Per-field validation outcomes, also as keys. */
export type TeamFieldErrorKey = "name" | "status" | "color" | "leader" | "members";
export type TeamField = "name" | "description" | "status" | "color" | "leaderMembershipId" | "memberIds";

export interface TeamActionState { status:"idle"|"success"|"error"; messageKey?:TeamMessageKey; fieldErrors?:Partial<Record<TeamField,TeamFieldErrorKey>>; }
export const initialTeamActionState:TeamActionState={status:"idle"};

/** What the non-form actions return. Same rule: an outcome, not a sentence. */
export interface TeamMutationResult { ok:boolean; messageKey:TeamMessageKey; }
