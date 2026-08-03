import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";

export type PartnerStatus = "invited" | "accepted" | "declined" | "revoked";

export interface SitePartner {
  id: string;
  companyId: string;
  companyName: string;
  city: string | null;
  status: PartnerStatus;
  note: string | null;
  createdAt: string;
  respondedAt: string | null;
  invitedBy: string | null;
}

export interface IncomingInvitation {
  id: string;
  projectId: string;
  projectName: string;
  ownerCompanyName: string;
  note: string | null;
  createdAt: string;
}

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Invitations live on the project, not the site: a partner brought in to do the
 * work is on the job, and a job spans every site under it. Sites are only where
 * the user thinks about it, which is why this takes a site id and resolves the
 * project itself.
 */
async function projectIdForSite(siteId: string): Promise<string | null> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("project_id")
    .eq("company_id", companyId)
    .eq("id", siteId)
    .maybeSingle();
  return (data as { project_id: string | null } | null)?.project_id ?? null;
}

interface PartnerRow {
  id: string;
  company_id: string;
  status: PartnerStatus;
  note: string | null;
  created_at: string;
  responded_at: string | null;
  companies: RelatedOne<{ name: string; city: string | null }>;
  users: RelatedOne<{ name: string }>;
}

export async function getSitePartners(siteId: string): Promise<SitePartner[]> {
  const projectId = await projectIdForSite(siteId);
  if (!projectId) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("project_partners")
    .select(
      "id,company_id,status,note,created_at,responded_at,companies!project_partners_company_id_fkey(name,city),users(name)",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as PartnerRow[]).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    companyName: first(row.companies)?.name ?? "",
    city: first(row.companies)?.city ?? null,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    invitedBy: first(row.users)?.name ?? null,
  }));
}

/**
 * Companies you may invite: those you already have a relationship with, minus
 * the ones already on this project. A declined or revoked invitation is not
 * excluded — circumstances change, and re-inviting is a normal thing to do.
 */
export async function getInvitableCompanies(siteId: string): Promise<{ id: string; name: string; city: string | null }[]> {
  const { companyId } = await requireActiveCompany();
  const projectId = await projectIdForSite(siteId);
  if (!projectId) return [];

  const supabase = await createClient();

  const { data: links } = await supabase
    .from("company_relationships")
    .select("source_company_id,target_company_id")
    .eq("status", "active")
    .or(`source_company_id.eq.${companyId},target_company_id.eq.${companyId}`);

  const otherIds = [
    ...new Set(
      ((links ?? []) as { source_company_id: string; target_company_id: string }[]).map((row) =>
        row.source_company_id === companyId ? row.target_company_id : row.source_company_id,
      ),
    ),
  ];
  if (otherIds.length === 0) return [];

  const { data: existing } = await supabase
    .from("project_partners")
    .select("company_id")
    .eq("project_id", projectId)
    .in("status", ["invited", "accepted"]);

  const taken = new Set(((existing ?? []) as { company_id: string }[]).map((row) => row.company_id));
  const available = otherIds.filter((id) => !taken.has(id));
  if (available.length === 0) return [];

  const { data } = await supabase.from("companies").select("id,name,city").in("id", available).order("name");
  return (data ?? []) as { id: string; name: string; city: string | null }[];
}

interface IncomingRow {
  id: string;
  project_id: string;
  note: string | null;
  created_at: string;
  projects: RelatedOne<{ name: string }>;
  companies: RelatedOne<{ name: string }>;
}

/**
 * Invitations waiting on *this* company's answer. Without somewhere to see
 * these, an invitation can be sent but never accepted — and since accepting is
 * what grants the access, the handshake would never complete.
 */
export async function getIncomingInvitations(): Promise<IncomingInvitation[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_partners")
    .select("id,project_id,note,created_at,projects(name),companies!project_partners_owner_company_id_fkey(name)")
    .eq("company_id", companyId)
    .eq("status", "invited")
    .order("created_at", { ascending: false });

  return ((data ?? []) as IncomingRow[]).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: first(row.projects)?.name ?? "",
    ownerCompanyName: first(row.companies)?.name ?? "",
    note: row.note,
    createdAt: row.created_at,
  }));
}
