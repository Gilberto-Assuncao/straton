"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { SITE_STATUSES } from "./types";
import { geocodeAddress } from "@/src/infrastructure/geocoding/client";
import { log } from "@/src/infrastructure/observability/logger";
import { searchBelgianCompanies } from "@/src/infrastructure/cbe/client";

export type SiteFormState = { status: "idle" | "error"; message: string };

const managerRoles = ["owner", "admin", "administrator", "manager"];

type ParsedSite = {
  name: string; reference: string | null; status: string;
  address: Record<string, string>; latitude: number | null; longitude: number | null;
  po_number: string | null; cost_center: string | null; project_id: string | null;
  client_company_id: string | null;
  starts_at: string | null; ends_at: string | null;
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

  const address: Record<string, string> = {};
  for (const key of ["street", "city", "postal_code", "country"]) {
    const value = text(formData, key);
    if (value) address[key] = value;
  }

  return {
    name, status, latitude, longitude, address,
    reference: text(formData, "reference") || null,
    po_number: text(formData, "poNumber") || null,
    cost_center: text(formData, "costCenter") || null,
    project_id: text(formData, "projectId") || null,
    client_company_id: text(formData, "clientCompanyId") || null,
    starts_at: startsAt || null,
    ends_at: endsAt || null,
  };
}

async function guard() {
  const { session, companyId } = await requireActiveCompany();
  const allowed = session.activeCompany!.roles.some((role) => managerRoles.includes(role));
  return { allowed, companyId, session };
}

export async function createSiteAction(_: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { status: "error", message: "You do not have permission to create sites." };

  const parsed = parseSite(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({ ...parsed, company_id: companyId });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/dashboard/sites");
  redirect("/dashboard/sites");
}

export async function updateSiteAction(_: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { status: "error", message: "You do not have permission to edit sites." };

  const siteId = text(formData, "siteId");
  if (!siteId) return { status: "error", message: "Site not found." };

  const parsed = parseSite(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").update(parsed).eq("id", siteId).eq("company_id", companyId);
  if (error) return { status: "error", message: error.message };

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
