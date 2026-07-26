import "server-only";

// CBE API (cbeapi.be) — the Belgian Crossroads Bank for Enterprises
// (KBO/BCE) exposed as a documented JSON REST API.
//
// Used in place of VIES for Belgian companies. VIES validates a VAT number
// across the whole EU but returns the address as one free-text blob that has
// to be split with a regular expression, and it knows nothing Belgium-specific
// — so `establishment_number`, `activity_start_date` and `registration_number`
// on `companies` stayed permanently empty. The CBE returns those as structured
// fields. VIES is kept for every other country; see lookupCompanyByVat.
//
// Base URL and shapes taken from the OpenAPI document at
// https://cbeapi.be/docs/api (bearer auth, servers: https://cbeapi.be/api).

const BASE_URL = "https://cbeapi.be/api";

interface CbeAddress {
  street: string | null;
  street_number: string | null;
  box: string | null;
  post_code: string | null;
  city: string | null;
  country_code: string | null;
  full_address: string;
}

interface CbeCompany {
  cbe_number: string;
  cbe_number_formatted: string;
  denomination: string;
  abbreviation: string | null;
  commercial_name: string | null;
  denomination_with_legal_form: string | null;
  address: CbeAddress | null;
  juridical_form: string | null;
  juridical_form_code: string | null;
  status: string | null;
  juridical_situation: string | null;
  start_date: string | null;
  contact_infos: { email?: string; phone?: string; web?: string } | null;
  nace_activities: { code: string; classification: string }[] | null;
}

export interface CompanyLookupResult {
  legalName: string;
  /** What to show in lists. The registry's commercial name when it has one. */
  displayName: string;
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  /** Belgium-only extras VIES cannot provide. */
  registrationNumber?: string;
  activityStartDate?: string;
  juridicalForm?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export type CbeLookupOutcome =
  | { valid: true; company: CompanyLookupResult }
  | { valid: false; reason: "not_found" | "unauthorized" | "unavailable" };

function joinStreet(address: CbeAddress | null): string {
  if (!address) return "";
  return [address.street, address.street_number, address.box ? `bus ${address.box}` : null]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function toResult(company: CbeCompany): CompanyLookupResult {
  const address = company.address;
  return {
    // denomination_with_legal_form reads like "ACME SRL"; the bare
    // denomination is the name people actually recognise, so prefer it.
    legalName: company.denomination || company.denomination_with_legal_form || company.commercial_name || "",
    // The commercial name is what customers actually call the company; the
    // abbreviation is the next best short form. Falls back to the legal name.
    displayName: company.commercial_name || company.abbreviation || company.denomination || "",
    addressLine1: joinStreet(address),
    postalCode: address?.post_code ?? "",
    city: address?.city ?? "",
    countryCode: address?.country_code ?? "BE",
    registrationNumber: company.cbe_number_formatted || company.cbe_number || undefined,
    activityStartDate: company.start_date ?? undefined,
    juridicalForm: company.juridical_form ?? undefined,
    phone: company.contact_infos?.phone || undefined,
    email: company.contact_infos?.email || undefined,
    website: company.contact_infos?.web || undefined,
  };
}

export function isCbeConfigured(): boolean {
  return Boolean(process.env.CBE_API_KEY);
}

export async function lookupBelgianCompany(enterpriseNumber: string): Promise<CbeLookupOutcome> {
  const apiKey = process.env.CBE_API_KEY;
  if (!apiKey) return { valid: false, reason: "unavailable" };

  // Belgian enterprise numbers are ten digits; a VAT number is the same value
  // prefixed with BE, sometimes written with dots or spaces.
  const digits = enterpriseNumber.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 10) return { valid: false, reason: "not_found" };
  const padded = digits.padStart(10, "0");

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/v1/company/${padded}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      // Registry data changes rarely; a day of caching spares the rate limit
      // without ever showing something meaningfully stale.
      next: { revalidate: 86400 },
    });
  } catch {
    return { valid: false, reason: "unavailable" };
  }

  if (response.status === 404) return { valid: false, reason: "not_found" };
  if (response.status === 401 || response.status === 403) return { valid: false, reason: "unauthorized" };
  if (!response.ok) return { valid: false, reason: "unavailable" };

  try {
    const payload = (await response.json()) as { data?: CbeCompany };
    if (!payload.data?.denomination && !payload.data?.denomination_with_legal_form) {
      return { valid: false, reason: "not_found" };
    }
    return { valid: true, company: toResult(payload.data) };
  } catch {
    return { valid: false, reason: "unavailable" };
  }
}

export interface CompanySearchHit {
  enterpriseNumber: string;
  name: string;
  city: string;
  postalCode: string;
}

// Searching by name matters for the "add a client while creating a site" flow
// (#32): whoever is filling that form knows the company name, not its
// enterprise number.
export async function searchBelgianCompanies(name: string, postCode?: string): Promise<CompanySearchHit[]> {
  const apiKey = process.env.CBE_API_KEY;
  if (!apiKey || name.trim().length < 3) return [];

  const params = new URLSearchParams({ name: name.trim() });
  if (postCode) params.set("post_code", postCode);

  try {
    const response = await fetch(`${BASE_URL}/v1/company/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: CbeCompany[] };
    return (payload.data ?? []).slice(0, 10).map((company) => ({
      enterpriseNumber: company.cbe_number_formatted || company.cbe_number,
      name: company.denomination || company.denomination_with_legal_form || "",
      city: company.address?.city ?? "",
      postalCode: company.address?.post_code ?? "",
    }));
  } catch {
    return [];
  }
}
