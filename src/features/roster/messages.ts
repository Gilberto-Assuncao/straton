/**
 * What the roster action can say, as keys into the `roster` namespace (#104).
 *
 * `errRoleUpdateFailed` covers both the insert and the delete branch. One key
 * is right: the person reading it did the same thing either way, and telling
 * them which half of a toggle failed helps nobody.
 */
export type RosterMessageKey =
  | "errNoPermission"
  | "errUnknownRole"
  | "errMemberNotFound"
  | "errRoleNotResolved"
  | "errRoleUpdateFailed"
  | "okUpdated";
