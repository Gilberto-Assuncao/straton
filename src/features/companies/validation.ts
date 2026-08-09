import { locales } from "@/src/i18n/routing";
import type { CompanyActionState, CompanyFormValues, CompanySettingsValues, ManagedCompanyStatus } from "./types";

// Derived, never restated: a hand-kept copy is how this list fell four
// languages behind the interface.
const languages: string[] = locales.map((locale) => locale.toLowerCase());
const statuses: ManagedCompanyStatus[] = ["active", "inactive", "suspended", "archived"];

function value(formData: FormData, key: string, max = 160) {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function isUrl(input: string) {
  if (!input) return true;
  try { const url = new URL(input); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
}

function isTimezone(input: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: input }).format(); return true; } catch { return false; }
}

export function validateCompanyForm(formData: FormData): { data?: CompanyFormValues; error?: CompanyActionState } {
  const data: CompanyFormValues = {
    legalName: value(formData, "legalName"), displayName: value(formData, "displayName"),
    registrationNumber: value(formData, "registrationNumber", 64), vatNumber: value(formData, "vatNumber", 64),
    countryCode: value(formData, "countryCode", 2).toUpperCase(), defaultLanguage: value(formData, "defaultLanguage", 5).toLowerCase(),
    timezone: value(formData, "timezone", 64), currencyCode: value(formData, "currencyCode", 3).toUpperCase(),
    phone: value(formData, "phone", 32), email: value(formData, "email", 254).toLowerCase(), website: value(formData, "website", 256),
    addressLine1: value(formData, "addressLine1"), addressLine2: value(formData, "addressLine2"), postalCode: value(formData, "postalCode", 24),
    city: value(formData, "city", 100), region: value(formData, "region", 100),
  };
  const fieldErrors: CompanyActionState["fieldErrors"] = {};
  if (data.legalName.length < 2) fieldErrors.legalName = "legalName";
  if (data.displayName.length < 2) fieldErrors.displayName = "displayName";
  if (!/^[A-Z]{2}$/.test(data.countryCode)) fieldErrors.countryCode = "countryCode";
  if (!languages.includes(data.defaultLanguage)) fieldErrors.defaultLanguage = "defaultLanguage";
  if (!isTimezone(data.timezone)) fieldErrors.timezone = "timezone";
  if (!/^[A-Z]{3}$/.test(data.currencyCode)) fieldErrors.currencyCode = "currencyCode";
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) fieldErrors.email = "email";
  if (!isUrl(data.website)) fieldErrors.website = "website";
  if (data.phone && !/^[+()\d\s.-]{6,32}$/.test(data.phone)) fieldErrors.phone = "phone";
  if (data.vatNumber && !/^[A-Z0-9 .-]{3,64}$/i.test(data.vatNumber)) fieldErrors.vatNumber = "vatNumber";
  if (data.registrationNumber && !/^[A-Z0-9 ./-]{2,64}$/i.test(data.registrationNumber)) fieldErrors.registrationNumber = "registrationNumber";
  return Object.keys(fieldErrors).length ? { error: { status: "error", messageKey: "reviewFields", fieldErrors } } : { data };
}

export function validateSettingsForm(formData: FormData): { data?: CompanySettingsValues; error?: CompanyActionState } {
  const data: CompanySettingsValues = {
    defaultLanguage: value(formData, "defaultLanguage", 5).toLowerCase(), timezone: value(formData, "timezone", 64),
    currencyCode: value(formData, "currencyCode", 3).toUpperCase(), dateFormat: value(formData, "dateFormat", 16),
    timeFormat: value(formData, "timeFormat", 3), weekStartsOn: value(formData, "weekStartsOn", 1), status: value(formData, "status", 16) as ManagedCompanyStatus,
    expectedStartTime: value(formData, "expectedStartTime", 5), expectedEndTime: value(formData, "expectedEndTime", 5),
    graceMinutes: value(formData, "graceMinutes", 4), punctualityRemindersEnabled: formData.get("punctualityRemindersEnabled") === "on",
  };
  const fieldErrors: CompanyActionState["fieldErrors"] = {};
  if (!languages.includes(data.defaultLanguage)) fieldErrors.defaultLanguage = "defaultLanguage";
  if (!isTimezone(data.timezone)) fieldErrors.timezone = "timezone";
  if (!/^[A-Z]{3}$/.test(data.currencyCode)) fieldErrors.currencyCode = "currencyCode";
  if (!["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(data.dateFormat)) fieldErrors.dateFormat = "dateFormat";
  if (!["12h", "24h"].includes(data.timeFormat)) fieldErrors.timeFormat = "timeFormat";
  if (!["0", "1", "6"].includes(data.weekStartsOn)) fieldErrors.weekStartsOn = "weekStartsOn";
  if (!statuses.includes(data.status)) fieldErrors.status = "status";
  if (data.expectedStartTime && !/^\d{2}:\d{2}$/.test(data.expectedStartTime)) fieldErrors.expectedStartTime = "expectedEndTime";
  if (data.expectedEndTime && !/^\d{2}:\d{2}$/.test(data.expectedEndTime)) fieldErrors.expectedEndTime = "expectedEndTime";
  if (!/^\d{1,3}$/.test(data.graceMinutes) || Number(data.graceMinutes) > 180) fieldErrors.graceMinutes = "graceMinutes";
  if (data.punctualityRemindersEnabled && (!data.expectedStartTime)) fieldErrors.expectedStartTime = "expectedStartTime";
  return Object.keys(fieldErrors).length ? { error: { status: "error", messageKey: "reviewFields", fieldErrors } } : { data };
}
