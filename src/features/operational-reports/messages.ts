/**
 * What the field-report actions can say, as keys (#104).
 *
 * Two unions because there are two screens with two namespaces: filling in and
 * reviewing a report is `operationalReports`, and building the template it is
 * filled in from is `reportTemplates`. Merging them would put a message about
 * field ordering in the namespace a worker on site reads.
 *
 * Same reasoning as `SiteMessageKey` and `EmployeeMessageKey`: the sentence is
 * resolved where it is rendered, and a key that does not exist is a compile
 * error rather than a raw `operationalReports.errReportNotFound` on screen.
 *
 * Between them these two files held twelve raw `error.message` returns. A
 * Postgres string cannot be a key, so each had to be given a sentence and a log
 * line (#27).
 */

/** Filling in, submitting and reviewing a report. Namespace `operationalReports`. */
export type ReportMessageKey =
  // Raised on the client before anything is sent, unlike every other member.
  // It belongs here because it is drawn in the same place by the same call, and
  // splitting it out would mean two types for one line of JSX.
  | "reportDateRequired"
  | "errReportNotFound"
  | "errOnlyAuthorEdits"
  | "errOnlyAuthorSubmits"
  | "errNoLongerEditable"
  | "errAlreadySubmitted"
  | "errNoPermissionReview"
  | "errOnlySubmittedReviewed"
  | "errReportSaveFailed"
  | "errReviewSaveFailed"
  | "okDraftSaved"
  | "okReportUpdated"
  | "okReportSubmitted"
  | "okReportApproved"
  | "okReportRejected"
  | "okChangesRequested";

/** Building the template. Namespace `reportTemplates`. */
export type TemplateMessageKey =
  | "errNoPermission"
  | "errTemplateNotFound"
  | "errTemplateNameRequired"
  | "errInvalidSegment"
  | "errFieldKeyRequired"
  | "errFieldLabelRequired"
  | "errInvalidFieldType"
  | "errChoiceNeedsOption"
  | "errKeyInUse"
  | "errCannotMoveFurther"
  | "errTemplateSaveFailed"
  | "errTemplateStatusFailed"
  | "errFieldSaveFailed"
  | "errFieldRemoveFailed"
  | "okTemplateReactivated"
  | "okTemplateDeactivated"
  | "okFieldRetired"
  | "okFieldRemoved"
  | "okOrderUpdated";
