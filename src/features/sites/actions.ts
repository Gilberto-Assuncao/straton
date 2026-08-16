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
import { notifySiteAudience } from "./notify-audience";
import type { SiteMessageKey } from "./messages";

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
  /** null while idle. A key into `sites`, never a sentence (#104). */
  messageKey: SiteMessageKey | null;
  values?: Record<string, string>;
};

const managerRoles = ["owner", "admin", "administrator", "manager"];

/** Every field `parseSite` reads, so nothing typed is dropped on a refusal. */
const SITE_FIELDS = [
  "name", "reference", "status", "street", "city", "postal_code", "latitude", "longitude",
  "poNumber", "costCenter", "clientCompanyId", "startsAt", "endsAt",
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
  po_number: string | null; cost_center: string | null;
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
function parseSite(formData: FormData): ParsedSite | { error: SiteMessageKey } {
  const name = text(formData, "name");
  const status = text(formData, "status") || "active";
  const latRaw = text(formData, "latitude");
  const lonRaw = text(formData, "longitude");
  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");

  if (name.length < 2) return { error: "errNameRequired" };
  if (!SITE_STATUSES.includes(status as (typeof SITE_STATUSES)[number])) return { error: "errInvalidStatus" };

  if (Boolean(latRaw) !== Boolean(lonRaw)) {
    return { error: "errCoordinatePair" };
  }
  const latitude = latRaw ? Number(latRaw) : null;
  const longitude = lonRaw ? Number(lonRaw) : null;
  if (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return { error: "errLatitudeRange" };
  }
  if (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return { error: "errLongitudeRange" };
  }
  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
    return { error: "errEndBeforeStart" };
  }

  // Planning, moved here from the project (#77). All optional, deliberately:
  // three times in one day a required field became a dead end — a required
  // team blocked the invite, a required client blocked the project — and a
  // company that has not costed a job yet still has people working on it.
  const priority = text(formData, "priority") || "medium";
  if (!SITE_PRIORITIES.includes(priority as (typeof SITE_PRIORITIES)[number])) {
    return { error: "errInvalidPriority" };
  }
  const estimatedHours = parseOptionalNumber(text(formData, "estimatedHours"));
  if (!estimatedHours.ok) return { error: "errEstimatedHours" };
  const budgetAmount = parseOptionalNumber(text(formData, "budgetAmount"));
  if (!budgetAmount.ok) return { error: "errBudgetAmount" };

  // `not null default 'EUR'` in the database, so blank has to become the
  // default here rather than travelling as an empty string and being refused.
  const budgetCurrency = (text(formData, "budgetCurrency") || "EUR").toUpperCase();
  if (!/^[A-Z]{3}$/.test(budgetCurrency)) return { error: "errCurrencyCode" };

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
  if (!allowed) return { status: "error", messageKey: "errNoPermissionCreate", values };

  const parsed = parseSite(formData);
  if ("error" in parsed) return { status: "error", messageKey: parsed.error, values };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").insert({ ...parsed, company_id: companyId });
  if (error) {
    log.error({ event: "site_insert_failed", source: "createSiteAction", companyId, code: error.code }, error);
    return { status: "error", messageKey: "errSiteSaveFailed", values };
  }

  revalidatePath("/dashboard/sites");
  redirect("/dashboard/sites");
}

export async function updateSiteAction(_: SiteFormState, formData: FormData): Promise<SiteFormState> {
  const values = submitted(formData);
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { status: "error", messageKey: "errNoPermissionEdit", values };

  const siteId = text(formData, "siteId");
  if (!siteId) return { status: "error", messageKey: "errSiteNotFound", values };

  const parsed = parseSite(formData);
  if ("error" in parsed) return { status: "error", messageKey: parsed.error, values };

  const supabase = await createClient();
  const { error } = await supabase.from("sites").update(parsed).eq("id", siteId).eq("company_id", companyId);
  if (error) {
    log.error({ event: "site_update_failed", source: "updateSiteAction", companyId, code: error.code }, error);
    return { status: "error", messageKey: "errSiteSaveFailed", values };
  }

  // After the update, never before: an announcement about a change that did
  // not happen is worse than a change nobody was told about. Awaited rather
  // than fired and forgotten, because `redirect` throws and would abandon it.
  await notifySiteAudience({
    siteId,
    actorId: session.user.id,
    key: "siteChanged",
    params: { siteName: parsed.name },
  });

  revalidatePath("/dashboard/sites");
  redirect("/dashboard/sites");
}

// Sites are archived rather than deleted: timesheet entries and operational
// reports reference them, and removing the row would strip the location from
// work that already happened.
export async function archiveSiteAction(siteId: string, archived: boolean): Promise<{ ok: boolean; messageKey: SiteMessageKey | null }> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionArchive" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({ status: archived ? "archived" : "active" })
    .eq("id", siteId)
    .eq("company_id", companyId);
  if (error) {
    log.error({ event: "site_archive_failed", source: "archiveSiteAction", companyId, code: error.code }, error);
    return { ok: false, messageKey: "errArchiveFailed" };
  }

  revalidatePath("/dashboard/sites");
  return { ok: true, messageKey: archived ? "okSiteArchived" : "okSiteReactivated" };
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
  | { ok: false; messageKey: SiteMessageKey };

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
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAddClient" };

  const displayName = input.displayName.trim();
  if (displayName.length < 2) return { ok: false, messageKey: "errClientNameRequired" };

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

  if (error || !data) {
    // #27: the code goes to the log, the constraint text never to the screen.
    if (error) log.error({ event: "client_company_create_failed", source: "createClientCompanyAction", companyId, code: error.code }, error);
    return { ok: false, messageKey: "errClientAddFailed" };
  }

  revalidatePath("/dashboard/sites");
  return { ok: true, id: data as string, name: displayName };
}

// --- Partner companies on a project (#33) --------------------------------

export type PartnerActionResult = { ok: boolean; messageKey: SiteMessageKey };

/**
 * Invites a partner company onto this work location (#77).
 *
 * Used to invite onto the location's *project*, which meant a location with no
 * project could not collaborate at all — the screen said so, in amber, and
 * there was nothing the manager could do about it from there. The relationship
 * belongs to the company; what a chantier gets is an allocation.
 *
 * The invitation grants nothing on its own — the partner has to accept, and
 * only then do they see the location and gain the right to allocate their own
 * people. That asymmetry is enforced in the database (migration
 * 202608120002), not here.
 */
export async function invitePartnerAction(
  siteId: string,
  partnerCompanyId: string,
  note: string,
): Promise<PartnerActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionInvitePartners" };
  if (!partnerCompanyId) return { ok: false, messageKey: "errChooseCompany" };

  const supabase = await createClient();

  const { error } = await supabase.from("site_partners").insert({
    site_id: siteId,
    company_id: partnerCompanyId,
    // Checked against the location by the insert policy rather than trusted
    // from here, so it cannot be used to forge an invitation onto somebody
    // else's chantier.
    owner_company_id: companyId,
    invited_by: session.user.id,
    note: note.trim() || null,
  });

  if (error) {
    if (error.code !== "23505") {
      log.error({ event: "site_partner_invite_failed", source: "invitePartnerAction", companyId, code: error.code }, error);
    }
    return { ok: false, messageKey: error.code === "23505" ? "errPartnerAlreadyInvited" : "errInviteFailed" };
  }

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: "okInvitationSent" };
}

export async function respondToInvitationAction(
  invitationId: string,
  accept: boolean,
): Promise<PartnerActionResult> {
  const { allowed } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAnswerInvitations" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_partners")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", invitationId);

  if (error) {
    log.error({ event: "site_partner_answer_failed", source: "respondToInvitationAction", code: error.code }, error);
    return { ok: false, messageKey: "errInvitationAnswerFailed" };
  }

  revalidatePath("/dashboard/sites");
  return { ok: true, messageKey: accept ? "okInvitationAccepted" : "okInvitationDeclined" };
}

/**
 * Withdraws a partner from the location. The row is kept rather than deleted,
 * so the record of who was on the job — and when they left it — survives; on a
 * Belgian site that history is the answer to a chain-liability question.
 */
export async function revokePartnerAction(siteId: string, invitationId: string): Promise<PartnerActionResult> {
  const { allowed } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionRemovePartners" };

  const supabase = await createClient();
  const { error } = await supabase.from("site_partners").update({ status: "revoked" }).eq("id", invitationId);
  if (error) {
    log.error({ event: "site_partner_revoke_failed", source: "revokePartnerAction", code: error.code }, error);
    return { ok: false, messageKey: "errPartnerRemoveFailed" };
  }

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: "okPartnerRemoved" };
}

// --- Subdivisions inside a work location (#77) ---------------------------

export type SiteAreaActionResult = { ok: boolean; messageKey: SiteMessageKey };

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
): SiteMessageKey {
  if (error.code === "23505") return "errAreaDuplicateName";
  if (error.code === "23001") return "errAreaLastOne";
  // Hours point at it (#77), and the foreign key is `on delete restrict` on
  // purpose: detaching paid work from the place it happened is not something
  // a delete button should be able to do quietly. Closing is the way out.
  if (error.code === "23503") return "errAreaHasHours";

  log.error({
    event: "site_area_write_failed",
    source: context.source,
    companyId: context.companyId,
    userId: context.userId,
    code: error.code,
  });
  return "errAreaSaveFailed";
}

export async function createSiteAreaAction(
  siteId: string,
  name: string,
  description: string,
): Promise<SiteAreaActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAreas" };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, messageKey: "errAreaNameRequired" };

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
  if (error) return { ok: false, messageKey: areaError(error, { source: "createSiteAreaAction", companyId, userId: session.user.id }) };

  // No `siteAreaId`: the subdivision did not exist a moment ago, so nobody can
  // have been following it. This is news about the location.
  await notifySiteAudience({
    siteId,
    actorId: session.user.id,
    key: "siteAreaChanged",
    params: { areaName: trimmed },
  });

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: "okAreaAdded" };
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
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAreas" };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, messageKey: "errAreaNameRequired" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_areas")
    .update({ name: trimmed, is_default: false })
    .eq("id", areaId)
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .select("id");
  if (error) return { ok: false, messageKey: areaError(error, { source: "renameSiteAreaAction", companyId, userId: session.user.id }) };
  // RLS refuses a forbidden update by matching no rows, not by raising — so
  // without this the screen reports a rename that never happened. That exact
  // silence has been found on four tables in this project already.
  if ((data ?? []).length === 0) return { ok: false, messageKey: "errAreaNotFound" };

  // Addressed to the subdivision, unlike the two above: this one exists and
  // people may be following it specifically. Whoever asked to hear only about
  // Elétrica da Sala is told when Elétrica da Sala is renamed, and the rest of
  // the chantier's followers are told too — they subscribed to the location,
  // and the location includes it.
  await notifySiteAudience({
    siteId,
    siteAreaId: areaId,
    actorId: session.user.id,
    key: "siteAreaChanged",
    params: { areaName: trimmed },
  });

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: "okAreaRenamed" };
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
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAreas" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_areas")
    .update({ is_active: active })
    .eq("id", areaId)
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .select("id");
  if (error) return { ok: false, messageKey: areaError(error, { source: "setSiteAreaActiveAction", companyId, userId: session.user.id }) };
  if ((data ?? []).length === 0) return { ok: false, messageKey: "errAreaNotFound" };

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: active ? "okAreaReopened" : "okAreaClosed" };
}

/** For the one typed by mistake. Closing is what a finished subdivision gets. */
export async function deleteSiteAreaAction(siteId: string, areaId: string): Promise<SiteAreaActionResult> {
  const { allowed, companyId, session } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAreas" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_areas")
    .delete()
    .eq("id", areaId)
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .select("id");
  if (error) return { ok: false, messageKey: areaError(error, { source: "deleteSiteAreaAction", companyId, userId: session.user.id }) };
  if ((data ?? []).length === 0) return { ok: false, messageKey: "errAreaNotFound" };

  // Also without `siteAreaId`, and for the opposite reason: the subdivision is
  // gone, and with it — by `on delete cascade` — every subscription that only
  // ever spoke about it. Addressing them would reach nobody.
  await notifySiteAudience({
    siteId,
    actorId: session.user.id,
    key: "siteAreaChanged",
    params: {},
  });

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: "okAreaRemoved" };
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

export type AudienceActionResult = { ok: boolean; messageKey: SiteMessageKey };

/**
 * Põe um colega na lista de quem é avisado sobre este local (#83).
 *
 * `companyId` vem da sessão, nunca do formulário. A política de insert só
 * verifica os valores que lhe entregam, e aceitar este do cliente seria
 * oferecer a quem soubesse escrever um pedido a hipótese de subscrever gente
 * de outra empresa — que é exatamente o que o gatilho recusa uma camada
 * abaixo. Aqui é a primeira das duas fechaduras, não a única.
 *
 * `siteAreaId` vazio significa o local inteiro. É o caso comum e por isso é o
 * valor por omissão do formulário, não uma opção escondida.
 */
export async function subscribeToSiteAction(
  siteId: string,
  userId: string,
  siteAreaId: string,
): Promise<AudienceActionResult> {
  const { allowed, companyId } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAudience" };
  if (!userId) return { ok: false, messageKey: "errChooseSomebody" };

  const supabase = await createClient();
  const { error } = await supabase.from("site_notification_subscribers").insert({
    site_id: siteId,
    company_id: companyId,
    user_id: userId,
    site_area_id: siteAreaId || null,
  });

  if (error) {
    // The duplicate is the one case worth naming: it is a thing the person did
    // and can undo. Everything else is a refusal by a policy or a trigger, and
    // repeating "new row violates row-level security policy" to a site manager
    // tells them nothing they can act on — that belongs in the log (#27).
    if (error.code === "23505") return { ok: false, messageKey: "errAlreadyOnList" };
    log.error({ event: "site_subscriber_insert_failed", source: "subscribeToSiteAction", code: error.code }, error);
    return { ok: false, messageKey: "errAddToListFailed" };
  }

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: "okAddedToList" };
}

/**
 * Tira alguém da lista.
 *
 * Apagado e não marcado como inativo, ao contrário do parceiro revogado: uma
 * subscrição não é um facto histórico sobre quem esteve na obra, é uma
 * preferência sobre o presente. Guardá-la só criaria uma segunda forma de
 * estar na lista sem estar.
 */
export async function unsubscribeFromSiteAction(
  siteId: string,
  subscriberId: string,
): Promise<AudienceActionResult> {
  const { allowed } = await guard();
  if (!allowed) return { ok: false, messageKey: "errNoPermissionAudience" };

  const supabase = await createClient();
  const { error } = await supabase.from("site_notification_subscribers").delete().eq("id", subscriberId);
  if (error) {
    log.error({ event: "site_subscriber_delete_failed", source: "unsubscribeFromSiteAction", code: error.code }, error);
    return { ok: false, messageKey: "errRemoveFromListFailed" };
  }

  revalidatePath(`/dashboard/sites/${siteId}`);
  return { ok: true, messageKey: "okRemovedFromList" };
}
