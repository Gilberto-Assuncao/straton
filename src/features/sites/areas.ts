import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";

import type { SiteAreaRecord } from "./types";

interface SiteAreaRow {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

/**
 * The subdivisions of one work location (#77).
 *
 * There is always at least one — a trigger creates it with the location
 * (migration 202608100003) and a deferred constraint refuses to let the last
 * one go. So an empty result here means the location does not exist, or is not
 * readable, and never "this location has no subdivisions".
 *
 * Inactive ones are returned too. A subdivision that is finished still names
 * hours that were worked in it, and hiding it from the screen that manages it
 * would leave no way to bring it back.
 */
export async function getSiteAreas(siteId: string): Promise<SiteAreaRecord[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data } = await supabase
    .from("site_areas")
    .select("id,site_id,name,description,is_active,is_default,sort_order")
    .eq("company_id", companyId)
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return ((data ?? []) as SiteAreaRow[]).map((row) => ({
    id: row.id,
    siteId: row.site_id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    isDefault: row.is_default,
    sortOrder: row.sort_order,
  }));
}
