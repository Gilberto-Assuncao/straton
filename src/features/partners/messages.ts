/**
 * What the partnership actions can say, as keys into the `companies` namespace
 * (#104).
 *
 * Same reasoning as `SiteMessageKey`: a server action cannot know the caller's
 * locale, and a sentence written here reaches a Polish screen in English. The
 * namespace is `companies` because that is what `PartnersPanel` resolves with —
 * a key is only useful where somebody can look it up.
 */
export type PartnerMessageKey =
  | "errNoPermissionRequest"
  | "errNoPermissionRespond"
  | "errSelfPartnership"
  | "errRelationshipExists"
  | "errRequestFailed"
  | "errRequestNotFound"
  | "errNotTheInvitedCompany"
  | "errAlreadyAnswered"
  | "errAnswerFailed"
  | "okRequestSent"
  | "okPartnershipAccepted"
  | "okPartnershipRejected";
