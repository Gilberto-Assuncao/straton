"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { SITE_STATUSES } from "./types";

export type SiteFormState = { status: "idle" | "error"; message: string };

const managerRoles = ["owner", "admin", "administrator", "manager"];

type ParsedSite = {
  name: string; reference: string | null; status: string;
  address: Record<string, string>; latitude: number | null; longitude: number | null;
  po_number: string | null; cost_center: string | null; project_id: string | null;
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
    starts_at: startsAt || null,
    ends_at: endsAt || null,
  };
}

async function guard() {
  const { session, companyId } = await requireActiveCompany();
  const allowed = session.activeCompany!.roles.some((role) => managerRoles.includes(role));
  return { allowed, companyId };
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
