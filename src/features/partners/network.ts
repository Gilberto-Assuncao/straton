import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type { RelationshipStatus, RelationshipType } from "./data";
import { chainSide, type ChainSide } from "./chain";

export type { ChainSide } from "./chain";

export interface NetworkProject {
  id: string;
  name: string;
  /** true when the project is yours and they were invited onto it. */
  yoursTheirs: boolean;
  status: string;
}

export interface NetworkCompany {
  id: string;
  name: string;
  /**
   * From company_directory, which carries only id/name/VAT on purpose. The
   * number is here to tell two similarly-named companies apart — widening that
   * view to every authenticated user just to show a city is not a trade worth
   * making.
   */
  vatNumber: string | null;
  relationshipType: RelationshipType;
  relationshipStatus: RelationshipStatus;
  side: ChainSide;
  projects: NetworkProject[];
  /** Their people currently assigned to projects of yours. */
  peopleOnYourProjects: number;
}

export interface CompanyNetwork {
  companyName: string;
  companies: NetworkCompany[];
}

interface RelationshipRow {
  source_company_id: string;
  target_company_id: string;
  relationship_type: RelationshipType;
  status: RelationshipStatus;
}

interface PartnerRow {
  company_id: string;
  owner_company_id: string;
  status: string;
  projects: { id: string; name: string; status: string } | { id: string; name: string; status: string }[] | null;
}

interface AssignmentRow {
  company_id: string;
  projects: { company_id: string } | { company_id: string }[] | null;
}

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Your immediate network — and only that.
 *
 * RLS on company_relationships reveals a row only to the two companies named in
 * it, so a chain beyond your direct neighbours is not readable and this cannot
 * draw one. That is the intended shape, not a limitation to work around: your
 * subcontractor's own subcontractors are their business, and Belgian chain
 * liability is discharged by what you can show about the people actually on
 * your sites — which is what the project columns below carry.
 */
export async function getCompanyNetwork(): Promise<CompanyNetwork> {
  const { companyId, session } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: relationshipRows }, { data: partnerRows }, { data: assignmentRows }] = await Promise.all([
    supabase
      .from("company_relationships")
      .select("source_company_id,target_company_id,relationship_type,status")
      .or(`source_company_id.eq.${companyId},target_company_id.eq.${companyId}`),
    supabase
      .from("project_partners")
      .select("company_id,owner_company_id,status,projects(id,name,status)")
      .eq("status", "accepted"),
    supabase
      .from("project_memberships")
      .select("company_id,projects!inner(company_id)")
      .neq("company_id", companyId)
      .is("left_at", null),
  ]);

  const relationships = (relationshipRows ?? []) as RelationshipRow[];
  const otherIds = [
    ...new Set(
      relationships.map((row) => (row.source_company_id === companyId ? row.target_company_id : row.source_company_id)),
    ),
  ];
  if (otherIds.length === 0) {
    return { companyName: session.activeCompany?.name ?? "", companies: [] };
  }

  // company_directory rather than companies: a counterparty you are not a
  // member of is hidden by the companies table's own policies, and a network
  // diagram with blank nodes is worse than no diagram.
  const { data: directoryRows } = await supabase
    .from("company_directory")
    .select("id,name,vat_number")
    .in("id", otherIds);
  const directory = new Map(
    ((directoryRows ?? []) as { id: string; name: string; vat_number: string | null }[]).map((row) => [row.id, row]),
  );

  const projectsByCompany = new Map<string, NetworkProject[]>();
  for (const row of (partnerRows ?? []) as PartnerRow[]) {
    const project = first(row.projects);
    if (!project) continue;
    const yours = row.owner_company_id === companyId;
    const other = yours ? row.company_id : row.owner_company_id;
    if (other === companyId) continue;
    const list = projectsByCompany.get(other) ?? [];
    list.push({ id: project.id, name: project.name, yoursTheirs: yours, status: project.status });
    projectsByCompany.set(other, list);
  }

  const peopleByCompany = new Map<string, number>();
  for (const row of (assignmentRows ?? []) as AssignmentRow[]) {
    if (first(row.projects)?.company_id !== companyId) continue;
    peopleByCompany.set(row.company_id, (peopleByCompany.get(row.company_id) ?? 0) + 1);
  }

  const companies: NetworkCompany[] = relationships.flatMap((row) => {
    const isSource = row.source_company_id === companyId;
    const otherId = isSource ? row.target_company_id : row.source_company_id;
    const entry = directory.get(otherId);
    if (!entry) return [];

    return [
      {
        id: otherId,
        name: entry.name,
        vatNumber: entry.vat_number,
        relationshipType: row.relationship_type,
        relationshipStatus: row.status,
        side: chainSide(row.relationship_type, isSource),
        projects: projectsByCompany.get(otherId) ?? [],
        peopleOnYourProjects: peopleByCompany.get(otherId) ?? 0,
      },
    ];
  });

  companies.sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
  return { companyName: session.activeCompany?.name ?? "", companies };
}
