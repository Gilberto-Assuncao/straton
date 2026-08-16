export type ManagedCompanyStatus = "active" | "inactive" | "suspended" | "archived";
export type CompanyPermission = "view" | "edit_profile" | "edit_settings" | "archive" | "reactivate";

export interface CompanyFormValues {
  legalName: string;
  displayName: string;
  registrationNumber: string;
  vatNumber: string;
  countryCode: string;
  defaultLanguage: string;
  timezone: string;
  currencyCode: string;
  phone: string;
  email: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  region: string;
}

export interface CompanySettingsValues {
  defaultLanguage: string;
  timezone: string;
  currencyCode: string;
  dateFormat: string;
  timeFormat: string;
  weekStartsOn: string;
  status: ManagedCompanyStatus;
  expectedStartTime: string;
  expectedEndTime: string;
  graceMinutes: string;
  punctualityRemindersEnabled: boolean;
}

export interface CompanySummary {
  id: string;
  displayName: string;
  legalName: string;
  slug: string | null;
  status: ManagedCompanyStatus;
  countryCode: string;
  city: string;
  createdAt: string;
  roles: string[];
}

export interface CompanyDetail extends CompanySummary, CompanyFormValues {
  logoUrl: string | null;
  settings: CompanySettingsValues;
  permissions: CompanyPermission[];
  memberCounts: { total: number; active: number; invited: number; suspended: number };
  teamCounts: { total: number; active: number; leaders: number; members: number };
  activeProjects: number;
}

/**
 * Message keys, never sentences (#28).
 *
 * A server action cannot reliably know the caller's locale, so returning
 * "Company profile updated." bakes English into a response the interface has no
 * way to translate. Same rule as TeamMessageKey and AuthMessageKey.
 */
export type CompanyMessageKey =
  | "profileUpdated"
  | "settingsUpdated"
  | "companyArchived"
  | "companyReactivated"
  | "noPermissionProfile"
  | "noPermissionSettings"
  | "ownerArchiveOnly"
  | "ownerOnly"
  | "reviewFields"
  | "failed";

/**
 * Why a VAT lookup came back empty.
 *
 * Produced in `src/infrastructure/vies/client.ts`, which is `server-only` and
 * three layers away from a screen. It is declared here rather than there
 * because the sentence is drawn by `CompanyDetailsForm`, in this namespace —
 * a key is only useful where somebody can resolve it.
 */
export type VatLookupMessageKey =
  | "vatEnterCountryAndNumber"
  | "vatServiceUnreachable"
  | "vatNotFound"
  | "vatNotValidated"
  | "vatNoCompanyName";

/** One key per field that can fail validation. */
export type CompanyFieldErrorKey =
  | "legalName" | "displayName" | "registrationNumber" | "vatNumber" | "countryCode"
  | "defaultLanguage" | "timezone" | "currencyCode" | "phone" | "email" | "website"
  | "status" | "dateFormat" | "timeFormat" | "weekStartsOn" | "graceMinutes"
  | "expectedStartTime" | "expectedEndTime";

export interface CompanyActionState {
  status: "idle" | "success" | "error";
  messageKey?: CompanyMessageKey;
  fieldErrors?: Partial<Record<keyof CompanyFormValues | keyof CompanySettingsValues, CompanyFieldErrorKey>>;
}

export const initialCompanyActionState: CompanyActionState = { status: "idle" };

/** What the non-form company actions return. An outcome, not a sentence. */
export interface CompanyMutationResult { ok: boolean; messageKey: CompanyMessageKey; }
