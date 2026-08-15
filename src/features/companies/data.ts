import "server-only";
import { createClient } from "@/src/infrastructure/supabase/server";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import type { CompanyDetail, CompanyPermission, CompanySummary, ManagedCompanyStatus } from "./types";

interface CompanyRow {
  id: string; name: string; legal_name: string | null; display_name: string | null; slug: string | null;
  registration_number: string | null; vat_number: string | null; country_code: string | null; default_language: string;
  timezone: string; currency: string; phone: string | null; email: string | null; website: string | null;
  address_line_1: string | null; address_line_2: string | null; postal_code: string | null; city: string | null;
  region: string | null; logo_url: string | null; status: ManagedCompanyStatus; created_at: string;
}

function permissions(roles: string[]): CompanyPermission[] {
  const result: CompanyPermission[] = ["view"];
  if (roles.some((role) => ["owner", "admin", "administrator"].includes(role))) result.push("edit_profile", "edit_settings");
  if (roles.includes("owner")) result.push("archive", "reactivate");
  return result;
}

export async function listCompanies(): Promise<CompanySummary[]> {
  const session = await requireAuthenticatedSession();
  return session.companies.map((company) => ({
    id: company.id, displayName: company.name, legalName: company.name, slug: null, status: company.status,
    countryCode: "", city: "", createdAt: "", roles: company.roles,
  }));
}

export async function getCompanyDetail(companyId?: string): Promise<CompanyDetail | null> {
  const session = await requireAuthenticatedSession();
  const targetId = companyId ?? session.activeCompany?.id;
  const membership = session.companies.find(({ id }) => id === targetId);
  if (!targetId || !membership) return null;
  const supabase = await createClient();
  const [{ data: row, error }, members, teams, leaders, teamMembers, locations, settings] = await Promise.all([
    supabase.from("companies").select("id,name,legal_name,display_name,slug,registration_number,vat_number,country_code,default_language,timezone,currency,phone,email,website,address_line_1,address_line_2,postal_code,city,region,logo_url,status,created_at").eq("id", targetId).maybeSingle(),
    supabase.from("company_memberships").select("status").eq("company_id", targetId),
    supabase.from("teams").select("status").eq("company_id", targetId),
    supabase.from("teams").select("id", { count: "exact", head: true }).eq("company_id", targetId).not("leader_membership_id", "is", null),
    supabase.from("team_memberships").select("id", { count: "exact", head: true }).eq("company_id", targetId).is("left_at", null),
    supabase.from("sites").select("id", { count: "exact", head: true }).eq("company_id", targetId).eq("status", "active"),
    supabase.from("company_settings").select("week_starts_on,date_format,time_format,expected_start_time,expected_end_time,grace_minutes,punctuality_reminders_enabled").eq("company_id", targetId).maybeSingle(),
  ]);
  if (error || !row) return null;
  const company = row as CompanyRow;
  const memberRows = members.data ?? [];
  const teamRows = teams.data ?? [];
  return {
    id: company.id, displayName: company.display_name ?? company.name, legalName: company.legal_name ?? company.name,
    slug: company.slug, status: company.status, countryCode: company.country_code ?? "", city: company.city ?? "", createdAt: company.created_at,
    roles: membership.roles, registrationNumber: company.registration_number ?? "", vatNumber: company.vat_number ?? "",
    defaultLanguage: company.default_language, timezone: company.timezone, currencyCode: company.currency,
    phone: company.phone ?? "", email: company.email ?? "", website: company.website ?? "", addressLine1: company.address_line_1 ?? "",
    addressLine2: company.address_line_2 ?? "", postalCode: company.postal_code ?? "", region: company.region ?? "", logoUrl: company.logo_url,
    permissions: permissions(membership.roles),
    settings: { defaultLanguage: company.default_language, timezone: company.timezone, currencyCode: company.currency,
      dateFormat: settings.data?.date_format ?? "DD/MM/YYYY", timeFormat: settings.data?.time_format ?? "24h",
      weekStartsOn: String(settings.data?.week_starts_on ?? 1), status: company.status,
      expectedStartTime: settings.data?.expected_start_time?.slice(0, 5) ?? "", expectedEndTime: settings.data?.expected_end_time?.slice(0, 5) ?? "",
      graceMinutes: String(settings.data?.grace_minutes ?? 15), punctualityRemindersEnabled: settings.data?.punctuality_reminders_enabled ?? false },
    memberCounts: { total: memberRows.length, active: memberRows.filter(({ status }) => status === "active").length,
      invited: memberRows.filter(({ status }) => status === "invited").length, suspended: memberRows.filter(({ status }) => status === "suspended").length },
    teamCounts: { total: teamRows.length, active: teamRows.filter(({ status }) => status === "active").length,
      leaders: leaders.count ?? 0, members: teamMembers.count ?? 0 }, activeProjects: locations.count ?? 0,
  };
}
