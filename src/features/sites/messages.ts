/**
 * What the site actions can say, as keys into the `sites` namespace (#104).
 *
 * These forty-two sentences used to be written in English inside the actions
 * and rendered raw — `<p role="alert">{state.message}</p>`. Somebody working in
 * Polish pressed Save on a nameless location and read "Enter a site name."
 *
 * A server action *does* run in the request and could translate itself. The key
 * is used anyway, for one reason worth the extra union: `t("errNameRequird")`
 * is not a compile error. next-intl renders the raw path and the build stays
 * green — which is how `nav.agenda` was on screen for seventy minutes. A member
 * of this union that nobody translated fails `locale-parity.test.ts`, and a
 * typo here fails `tsc`. Same shape as `AuthMessageKey` and `WeatherMessageKey`.
 *
 * The second effect was not the goal but is the larger one. A raw
 * `error.message` from Postgres cannot be a key, so the seven places that
 * returned one had to be given a sentence of their own. That is #27's rule
 * — the code is logged, the constraint text is not — and it takes this file's
 * `raw-error-leaks` budget from 7 to 0.
 */
export type SiteMessageKey =
  // Refusals by role. Separate keys rather than one "not allowed", because the
  // sentence is the only thing telling a person which permission they lack.
  | "errNoPermissionCreate"
  | "errNoPermissionEdit"
  | "errNoPermissionArchive"
  | "errNoPermissionAddClient"
  | "errNoPermissionInvitePartners"
  | "errNoPermissionAnswerInvitations"
  | "errNoPermissionRemovePartners"
  | "errNoPermissionAreas"
  | "errNoPermissionAudience"

  // What the site form refuses, before anything reaches the database.
  | "errNameRequired"
  | "errInvalidStatus"
  | "errCoordinatePair"
  | "errLatitudeRange"
  | "errLongitudeRange"
  | "errEndBeforeStart"
  | "errInvalidPriority"
  | "errEstimatedHours"
  | "errBudgetAmount"
  | "errCurrencyCode"

  // The site itself.
  | "errSiteNotFound"
  | "errSiteSaveFailed"
  | "errArchiveFailed"
  | "okSiteArchived"
  | "okSiteReactivated"

  // Client companies (#32).
  | "errClientNameRequired"
  | "errClientAddFailed"

  // Partner companies on a location (#33, #77).
  | "errChooseCompany"
  | "errPartnerAlreadyInvited"
  | "errInviteFailed"
  | "errInvitationAnswerFailed"
  | "errPartnerRemoveFailed"
  | "okInvitationSent"
  | "okInvitationAccepted"
  | "okInvitationDeclined"
  | "okPartnerRemoved"

  // Subdivisions (#77). The first three are expected states, not faults, which
  // is why each gets its own sentence instead of the generic one.
  | "errAreaDuplicateName"
  | "errAreaLastOne"
  | "errAreaHasHours"
  | "errAreaSaveFailed"
  | "errAreaNameRequired"
  | "errAreaNotFound"
  | "okAreaAdded"
  | "okAreaRenamed"
  | "okAreaReopened"
  | "okAreaClosed"
  | "okAreaRemoved"

  // Who hears about this location (#83).
  | "errChooseSomebody"
  | "errAlreadyOnList"
  | "errAddToListFailed"
  | "errRemoveFromListFailed"
  | "okAddedToList"
  | "okRemovedFromList";
