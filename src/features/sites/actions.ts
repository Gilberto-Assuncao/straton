"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { SITE_PRIORITIES, SITE_STATUSES } from "./types";
import { parseOptionalNumber } from "./planning";
import { geocodeAddress } from "@/src/infrastructure/geocoding/client";
import { log } from "@/src/infrastructure/observability/logger";
import { searchBelgianCompanies } from "@/src/infrastructure/cbe/client";

/**
 * `values` is what was typed, echoed back with the refusal.
 *
 * A server action re-renders a fresh form, so uncontrolled inputs come back
 * empty and everything has to be typed again — next to an error describing an
 * attempt that is no longer on screen. Fixed for the availability form in #75,
 * and registered as #74 for the eight others; this form is one of them, and it
 * is fixed here because this change is what adds five more fields to it.
 */
export type SiteFormState = {
  status: "idle" | "error";
  message: string;
  values?: Record<string, string>;
};

const managerRoles = ["owner", "admin", "administrator", "manager"];

/** Every field `parseSite` reads, so nothing typed is dropped on a refusal. */
const SITE_FIELDS = [
  "name", "reference", "status", "street", "city", "postal_code", "latitude", "longitude",
  "poNumber", "costCenter", "projectId", "clientCompanyId", "startsAt", "endsAt",
  "priority", "estimatedHours", "budgetAmount", "budgetCurrency", "description",
] as const;

function submitted(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of SITE_FIELDS) values[key] = String(formData.get(key) ?? "");
  return values;
}

type ParsedSite = {
  name: string; reference: string | null; status: string;
  address: Record<string, string>; latitude: number | null; longitude: number | null;
  po_number: string | null; cost_center: string | null; project_id: string | null;
  client_company_id: string | null;
  starts_at: string | null; ends_at: string | null;
  priority: string; estimated_hours: number | null;
  budget_amount: number | null; budget_currency: string;
  description: string | null;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Coordinates are optional, but a half-filled pair is worse than none: the
// weather forecast and the live map both key off having both values, so one
// without the other is rejected rather than silently stored.
function parseSite(formData: FormData): ParsedSite | { error: string } {
  const name = text(formData, "name");
  const status = text(formData, "status") || "active";
  const latRaw = text(formData, "latitude");
  const lonRaw = text(formData, "longitude");
  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");

  if (name.length < 2) return { error: "Enter a site name." };
  if (!SITE_STATUSES.includes(status as (typeof SITE_STATUSES)[number])) return { error: "Invalid status." };

  if (Boolean(latRaw) !== Boolean(lonRaw)) {
    return { error: "Enter both latitude and longitude, or leave both empty." };
  }
  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lonRaw ? Number(lonRaw) : null;
  if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return { error: "Latitude must be between -90 and 90." };
  }
  if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return { error: "Longitude must be between -180 and 180." };
  }
  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
    return { error: "End date must be after the start date." };
  }

  // Planning, moved here from the project (#77). All optional, deliberately:
  // three times in one day a required field became a dead end — a required
  // team blocked the invite, a required client blocked the project — and a
  // company that has not costed a job yet still has people working on it.
  const priority = text(formData, "priority") || "medium";
  if (!SITE_PRIORITIES.includes(priority as (typeof SITE_PRIORITIES)[number])) {
    return { error: "Invalid priority." };
  }
  const estimatedHours = parseOptionalNumber(text(formData, "estimatedHours"));
  if (!estimatedHours.ok) return { error: "Estimated hours must be a positive number, or empty." };
  const budgetAmount = parseOptionalNumber(text(formData, "budgetAmount"));
  if (!budgetAmount.ok) return { error: "The budget must be a positive number, or empty." };

  // `not null default 'EUR'` in the database, so blank has to become the
  // default here rather than travelling as an empty string and being refused.
  const budgetCurrency = (text(formData, "budgetCurrency") || "EUR").toUpperCase();
  if (!/^[A-Z]{3}$/.test(budgetCurrency)) return { error: "Currency must be a three-letter code, such as EUR." };

  const address: Record<string, string> = {};
  for (const key of ["street", "city", "postal_code", "country"]) {
    const value = text(formData, key);
    if (value) address[key] = value;
  }

  return {
    name, status, latitude, longitude, address, priority,
    reference: text(formData, "reference") || null,
    po_number: text(formData, "poNumber") || null,
    cost_center: text(formData, "costCenter") || null,
    project_id: text(formData, "projectId") || null,
    client_company_id: text(formData, "clientCompanyId") || null,
    starts_at: startsAt || null,
    ends_at: endsAt || null,
    estimated_hours: estimatedHours.value,
    budget_amount: budgetAmount.value,
    budget_currency: budgetCurrency,
    description: text(formData, "description") || null,
  };
}

async function guard() {
  const { session, companyId } = await requireActiveCompany();
  const allowed = session.activeCompany!.roles.some((role) => managerRoles.includes(role));
  return { allowed, companyId, session };
}

export async function createSiteAction(_: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const values = submitted(formData);
  const { allowed, companyId } = await guard();
  if (!allowed) return { status: "error", message: "You do not have permission to create sites.", values };

  const parsed = parseSite(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error, values };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({ ...parsed, company_id: companyId });
  if (error) return { status: "error", message: error.message, values };

  revalidatePath("/dashboard/sites");
  redirect("/dashboard/sites");
}

export async function updateSiteAction(_: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const values = submitted(formData);
  const { allowed, companyId } = await guard();
  if (!allowed) return { status: "error", message: "You do not have permission to edit sites.", values };

  const siteId = text(formData, "siteId");
  if (!siteId) return { status: "error", message: "Site not found.", values };

  const parsed = parseSite(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error, values };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").update(parsed).eq("id", siteId).eq("company_id", companyId);
  if (error) return { status: "error", message: error.message, values };

  revalidatePath("/dashboard/sites");
  redirect("/dashboard/sites");
}

// Sites are archived rather than deleted: timesheet entries and operational
// reports reference them, and removing the row would strip the location from
// work that already happened.
export async function archiveSiteAction(siteId: string, archived: boolean): Promise<{ ok: boolean; message: string }> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to archive sites." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({ status: archived ? "archived" : "active" })
    .eq("id", siteId)
    .eq("company_id", companyId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/sites");
  return { ok: true, message: archived ? "Site archived; history was preserved." : "Site reactivated." };
}

export type GeocodeActionResult =
  | { ok: true; latitude: number; longitude: number; matchedAddress: string }
  | { ok: false; reason: "no_match" | "unavailable" | "incomplete_address" | "not_allowed" };

// Coordinates are what make a site visible to the weather forecast and the
// live map, and nobody knows the coordinates of a roof. This turns the address
// the user already typed into the pair they would otherwise have to look up
// somewhere else.
export async function geocodeSiteAddressAction(address: {
  street?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
}): Promise<GeocodeActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, reason: "not_allowed" };

  const result = await geocodeAddress(address);
  if (result.found) {
    return { ok: true, latitude: result.latitude, longitude: result.longitude, matchedAddress: result.matchedAddress };
  }

  // Logged, because "unavailable" is the one outcome nobody on the screen can
  // do anything about, and until now it left no trace at all. Nominatim is a
  // free service that can rate-limit or refuse a datacentre address; if that
  // starts happening we should learn it from the logs rather than from someone
  // reporting that the button does nothing. Same lesson as the SMTP failure
  // behind #27.
  if (result.reason === "unavailable") {
    log.error({ event: "geocode_unavailable", source: "geocodeSiteAddressAction", companyId, userId: session.user.id });
  }

  return { ok: false, reason: result.reason };
}

// --- Client companies (#32) ---------------------------------------------

export type CreateClientResult =
  | { ok: true; id: string; name: string }
  | { ok: false; message: string };

/**
 * Creates the client and the relationship that makes it readable, in one
 * transaction, through create_client_company. A plain insert into `companies`
 * has no RLS policy and would fail — deliberately, so a client can never exist
 * without someone linked to it.
 */
export async function createClientCompanyAction(input: {
  displayName: string;
  registrationNumber?: string;
  vatNumber?: string;
  legalName?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
}): Promise<CreateClientResult> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to add a client." };

  const displayName = input.displayName.trim();
  if (displayName.length < 2) return { ok: false, message: "Enter the client name." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_client_company", {
    owner_company_id: companyId,
    display_name_input: displayName,
    relationship_type_input: "client",
    legal_name_input: input.legalName?.trim() || null,
    registration_number_input: input.registrationNumber?.trim() || null,
    vat_number_input: input.vatNumber?.trim() || null,
    country_code_input: "BE",
    address_line_1_input: input.addressLine1?.trim() || null,
    postal_code_input: input.postalCode?.trim() || null,
    city_input: input.city?.trim() || null,
    email_input: null,
    phone_input: null,
  });

  if (error || !data) return { ok: false, message: error?.message ?? "Unable to add the client." };

  revalidatePath("/dashboard/sites");
  return { ok: true, id: data as string, name: displayName };
}

// --- Partner companies on a project (#33) --------------------------------

export type PartnerActionResult = { ok: boolean; message: string };

/**
 * Invites a partner company onto the project this site belongs to.
 *
 * The invitation grants nothing on its own — the partner has to accept, and
 * only then do they see the sites and gain the right to assign their own
 * people. That asymmetry is enforced in the database (migration
 * 202608010004), not here.
 */
export async function invitePartnerAction(
  siteId: string,
  partnerCompanyId: string,
  note: string,
): Promise<PartnerActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to invite partners." };
  if (!partnerCompanyId) return { ok: false, message: "Choose a company to invite." };

  const supabase = await createClient();

  const { data: site } = await supabase
    .from("sites")
    .select("project_id")
    .eq("company_id", companyId)
    .eq("id", siteId)
    .maybeSingle();

  const projectId = (site as { project_id: string | null } | null)?.project_id;
  // A site with no project has nothing to invite anyone onto: the work — and
  // therefore the collaboration — is organised at project level.
  if (!projectId) return { ok: false, message: "Link this site to a project before inviting a partner." };

  const { error } = await supabase.from("project_partners").insert({
    project_id: projectId,
    company_id: partnerCompanyId,
    owner_company_id: companyId,
    invited_by: session.user.id,
    note: note.trim() || null,
  });

  if (error) {
    return {
      ok: false,
      message:
        error.code === "23505"
          ? "That company has already been invited to this project."
          : error.message,
    };
  }

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, message: "Invitation sent." };
}

export async function respondToInvitationAction(
  invitationId: string,
  accept: boolean,
): Promise<PartnerActionResult> {
  const { allowed } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to answer invitations." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("project_partners")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", invitationId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard/sites");
  return { ok: true, message: accept ? "Invitation accepted." : "Invitation declined." };
}

/**
 * Withdraws a partner from the project. The row is kept rather than deleted, so
 * the record of who was on the job — and when they left it — survives; on a
 * Belgian site that history is the answer to a chain-liability question.
 */
export async function revokePartnerAction(siteId: string, invitationId: string): Promise<PartnerActionResult> {
  const { allowed } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to remove partners." };

  const supabase = await createClient();
  const { error } = await supabase.from("project_partners").update({ status: "revoked" }).eq("id", invitationId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, message: "Partner removed from the project." };
}

// --- Subdivisions inside a work location (#77) ---------------------------

export type SiteAreaActionResult = { ok: boolean; message: string };

/**
 * Turns what the database refused into something the manager can act on.
 *
 * Two of these are expected states rather than faults, and each gets its own
 * sentence: a name already used in this location, and the last subdivision.
 *
 * Anything else is a fault, and the raw text is not shown. Handing the
 * constraint message to the screen would print the name of a table nobody on
 * it has heard of — the pattern #27 exists to stop, after `535 5.7.8
 * Authentication failed` and a literal `{}` both reached a customer. The code
 * is logged instead, so a real fault leaves a trace; the message is not, since
 * Postgres quotes the offending value back and that value is whatever somebody
 * typed.
 */
function areaError(
  error: { code?: string; message: string },
  context: { source: string; companyId: string; userId: string },
): string {
  if (error.code === "23505") return "There is already a subdivision with that name in this location.";
  if (error.code === "23001") return "A work location has to keep at least one subdivision.";
  // Hours point at it (#77), and the foreign key is `on delete restrict` on
  // purpose: detaching paid work from the place it happened is not something
  // a delete button should be able to do quietly. Closing is the way out.
  if (error.code === "23503") return "That subdivision already has hours recorded against it. Close it instead of deleting it.";

  log.error({
    event: "site_area_write_failed",
    source: context.source,
    companyId: context.companyId,
    userId: context.userId,
    code: error.code,
  });
  return "The subdivision could not be saved. Please try again.";
}

export async function createSiteAreaAction(
  siteId: string,
  name: string,
  description: string,
): Promise<SiteAreaActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to change subdivisions." };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, message: "Enter a name for the subdivision." };

  const supabase = await createClient();
  const { error } = await supabase.from("site_areas").insert({
    // `company_id` travels, but the database does not trust it: a trigger
    // overwrites it with the location's own and refuses a location belonging
    // to somebody else (migration 202608100002).
    company_id: companyId,
    site_id: siteId,
    name: trimmed,
    description: description.trim() || null,
  });
  if (error) return { ok: false, message: areaError(error, { source: "createSiteAreaAction", companyId, userId: session.user.id }) };

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, message: "Subdivision added." };
}

/**
 * Renames a subdivision, and gives up the translated label when it happens.
 *
 * `is_default` exists so the screen can print "Whole location" in the reader's
 * language instead of the name the trigger wrote, which is the location's own
 * and nobody's choice. Once a person names it, that reasoning is spent:
 * keeping the flag would mean showing a translation on top of the answer they
 * just gave, in every language including their own.
 */
export async function renameSiteAreaAction(
  siteId: string,
  areaId: string,
  name: string,
): Promise<SiteAreaActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to change subdivisions." };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, message: "Enter a name for the subdivision." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_areas")
    .update({ name: trimmed, is_default: false })
    .eq("id", areaId)
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .select("id");
  if (error) return { ok: false, message: areaError(error, { source: "renameSiteAreaAction", companyId, userId: session.user.id }) };
  // RLS refuses a forbidden update by matching no rows, not by raising — so
  // without this the screen reports a rename that never happened. That exact
  // silence has been found on four tables in this project already.
  if ((data ?? []).length === 0) return { ok: false, message: "That subdivision was not found." };

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, message: "Subdivision renamed." };
}

/**
 * Closes a subdivision, or reopens it.
 *
 * Deliberately not a delete: the floor that is finished still names the hours
 * worked on it, and a report that groups by subdivision has to keep something
 * to put them under.
 */
export async function setSiteAreaActiveAction(
  siteId: string,
  areaId: string,
  active: boolean,
): Promise<SiteAreaActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to change subdivisions." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_areas")
    .update({ is_active: active })
    .eq("id", areaId)
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .select("id");
  if (error) return { ok: false, message: areaError(error, { source: "setSiteAreaActiveAction", companyId, userId: session.user.id }) };
  if ((data ?? []).length === 0) return { ok: false, message: "That subdivision was not found." };

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, message: active ? "Subdivision reopened." : "Subdivision closed." };
}

/** For the one typed by mistake. Closing is what a finished subdivision gets. */
export async function deleteSiteAreaAction(siteId: string, areaId: string): Promise<SiteAreaActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, message: "You do not have permission to change subdivisions." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_areas")
    .delete()
    .eq("id", areaId)
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .select("id");
  if (error) return { ok: false, message: areaError(error, { source: "deleteSiteAreaAction", companyId, userId: session.user.id }) };
  if ((data ?? []).length === 0) return { ok: false, message: "That subdivision was not found." };

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, message: "Subdivision removed." };
}

export type CompanySuggestion = { enterpriseNumber: string; name: string; city: string; postalCode: string };

/**
 * Searches the Belgian register by name, because whoever fills this form knows
 * the company name — not its enterprise number.
 */
export async function searchClientSuggestionsAction(name: string): Promise<CompanySuggestion[]> {
  const { allowed } = await guard();
  if (!allowed) return [];
  return searchBelgianCompanies(name);
}
