// Actions return a key into the `auth` message namespace rather than a
// sentence. The text is resolved where it is rendered, so it always comes out
// in the viewer's locale — a server action cannot reliably know that, and
// hardcoding English there is what left every auth error untranslated.
export type AuthMessageKey =
  | "errNotConfigured"
  | "errMissingCredentials"
  | "errBadCredentials"
  | "errInvalidRegistration"
  | "errPasswordMismatch"
  | "errTermsRequired"
  | "okConfirmInbox"
  | "errInvalidEmail"
  | "okResetSent"
  | "errPasswordTooShort"
  | "okPasswordUpdated"
  | "errSessionExpired"
  | "errNoCompanyAccess"
  | "errCallbackFailed"
  // Accepting an invitation (#104). Distinct from `errSessionExpired`: nothing
  // has expired for a person who never had a session — their *link* has, and
  // the way out is to ask for another one, not to sign in again.
  | "errInviteExpired"
  | "errActivationFailed"
  | "okAccountActivated";

/**
 * What was typed, echoed back with a refusal (#74).
 *
 * The password is deliberately absent, and it is not an oversight to be
 * corrected later. Sending it back down means it travels the wire twice per
 * failed attempt and sits in the server action's response — for a value whose
 * whole point is that it goes one way. A mistyped e-mail should not cost you
 * the password you got right; a mistyped password should cost you the password,
 * which is the browser's job to refill and not ours.
 */
export interface AuthFormValues {
  email?: string;
  fullName?: string;
  accountType?: string;
}

export interface AuthActionState {
  status: "idle" | "error" | "success";
  messageKey?: AuthMessageKey;
  values?: AuthFormValues;
}

export const initialAuthState: AuthActionState = { status: "idle" };
