import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";

import type { SiteAddress, SiteRecord } from "./types";

export type { SiteAddress, SiteRecord } from "./types";
export { SITE_STATUSES } from "./types";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

interface SiteRow {
  id: string; name: string; reference: string | null; status: string | null;
  address: SiteAddress | null; latitude: number | null; longitude: number | null;
  po_number: string | null; cost_center: string | null; project_id: string | null;
  starts_at: string | null; ends_at: string | null;
  projects: RelatedOne<{ name: string }>;
}

function toRecord(row: SiteRow): SiteRecord {
  const project = first(row.projects);
  return {
    id: row.id, name: row.name, reference: row.reference, status: row.status ?? "active",
    address: row.address ?? {}, latitude: row.latitude, longitude: row.longitude,
    poNumber: row.po_number, costCenter: row.cost_center,
    projectId: row.project_id, projectName: project?.name ?? null,
    startsAt: row.starts_at, endsAt: row.ends_at,
  };
}

const SELECT = "id,name,reference,status,address,latitude,longitude,po_number,cost_center,project_id,starts_at,ends_at,projects(name)";

export async function getSites(): Promise<SiteRecord[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").select(SELECT).eq("company_id", companyId).order("name");
  if (error) throw new Error("Unable to load sites.");
  return ((data ?? []) as SiteRow[]).map(toRecord);
}

export async function getSiteById(siteId: string): Promise<SiteRecord | null> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select(SELECT).eq("company_id", companyId).eq("id", siteId).maybeSingle();
  return data ? toRecord(data as SiteRow) : null;
}

export async function getProjectOptions(): Promise<{ id: string; name: string }[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id,name").eq("company_id", companyId).order("name");
  return (data ?? []) as { id: string; name: string }[];
}
