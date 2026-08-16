/**
 * What the employee actions can say, as keys into the `employees` namespace
 * (#104). Same reasoning as `SiteMessageKey`: the sentence is resolved where it
 * is rendered, and a key that does not exist is a compile error rather than a
 * raw `employees.errEmployeeNotFound` on screen.
 *
 * `acceptInviteAction` is deliberately not here. It draws into `AuthStatus`
 * alongside sign-in and registration, so it returns an `AuthMessageKey` — and
 * that separation is what this file's conversion turned up as a live bug. See
 * the note on `AcceptInviteState`.
 *
 * This file also had the largest remaining `raw-error-leaks` budget, 14. A
 * Postgres string cannot be a key, so all fourteen had to be given a sentence
 * and a log line (#27).
 */
export type EmployeeMessageKey =
  // Refusals by role.
  | "errNoPermissionInvite"
  | "errNoPermissionEdit"
  | "errNoPermissionStatus"

  // What the invite and edit forms refuse before anything is written.
  | "errRequiredFields"
  | "errInvalidTeam"
  | "errRoleUnresolved"
  | "errAlreadyInCompany"
  | "errEmployeeNotFound"
  | "errCannotDeactivateSelf"
  | "errLeadsTheirTeam"

  // Failures with nothing on screen to fix. The detail goes to the log.
  | "errInviteEmailFailed"
  | "errInviteSaveFailed"
  | "errEmployeeSaveFailed"
  | "errTeamMoveFailed"
  | "errStatusChangeFailed"

  // Done.
  | "okEmployeeReactivated"
  | "okEmployeeDeactivated";
