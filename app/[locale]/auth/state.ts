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
  | "errCallbackFailed";

export interface AuthActionState {
  status: "idle" | "error" | "success";
  messageKey?: AuthMessageKey;
}

export const initialAuthState: AuthActionState = { status: "idle" };
