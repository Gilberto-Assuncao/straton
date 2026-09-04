import "server-only";

import { cookies } from "next/headers";
import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { createClient } from "@/src/infrastructure/supabase/server";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import { log } from "@/src/infrastructure/observability/logger";
import { refuseSupportSession, type SupportSessionRow } from "./session";

/**
 * Reading a customer's data as support (#19).
 *
 * Every function here goes through the service role, which bypasses RLS — so
 * every one of them is gated on the same two facts, checked again on each call
 * and never taken from the URL: this person is a platform admin, and they have
 * an open session naming *this* company.
 *
 * Read-only, by decision. Nothing in this file writes to a customer's tables.
 */
export const SUPPORT_SESSION_COOKIE = "straton-support-session";

/**
 * Whether the person asking may open a support session at all.
 *
 * Asked through the RPC rather than by reading `platform_admins`, because the
 * table has no read policy: the only question the application may ask is about
 * itself.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_platform_admin");
  if (error) {
    // Fail closed. An error here must never read as "yes".
    log.error({ event: "platform_admin_check_failed", source: "isPlatformAdmin", code: error.code });
    return false;
  }
  return data === true;
}

export interface SupportCompany {
  id: string;
  name: string;
  vat: string | null;
  city: string | null;
  status: string;
}

/** Every company on the platform, for the picker. Platform admins only. */
export async function getSupportCompanies(): Promise<SupportCompany[]> {
  if (!(await isPlatformAdmin())) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("companies")
    .select("id,name,vat,city,status")
    .order("name");
  return (data ?? []) as SupportCompany[];
}

export interface ActiveSupportSession {
  id: string;
  companyId: string;
  companyName: string;
  expiresAt: string;
}

/**
 * The session this browser is carrying, if it is still good for this company.
 *
 * Returns null for every kind of no — closed, expired, for another company, or
 * held by somebody who is no longer a platform admin. The caller renders the
 * same thing for all of them, and the reason goes to the log: a session
 * presented for the wrong company is worth being able to find later.
 */
export async function getSupportSession(companyId: string): Promise<ActiveSupportSession | null> {
  const [session, jar] = await Promise.all([requireAuthenticatedSession(), cookies()]);
  const id = jar.get(SUPPORT_SESSION_COOKIE)?.value;
  if (!id) return null;
  // Re-checked on every request, not once at the start: a privilege revoked
  // five minutes ago must not still be open in a tab.
  if (!(await isPlatformAdmin())) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("support_sessions")
    .select("id,admin_user_id,company_id,started_at,expires_at,ended_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as SupportSessionRow;
  // The cookie says which session; it does not say whose. A session belonging
  // to another admin is refused even if the cookie is valid.
  if (row.admin_user_id !== session.user.id) {
    log.error({ event: "support_session_wrong_owner", source: "getSupportSession" });
    return null;
  }

  const refusal = refuseSupportSession(row, companyId, new Date());
  if (refusal) {
    if (refusal === "otherCompany") {
      // Error and not warn, for the same reason as the missing-translation
      // logger: the alert rule subscribes to `error`, so a warning is a line
      // nobody reads. A session presented for a company it does not name is
      // either a bug or somebody trying the address bar, and both are worth
      // waking up for.
      log.error({ event: "support_session_other_company", source: "getSupportSession" });
    }
    return null;
  }

  const { data: company } = await admin.from("companies").select("name").eq("id", row.company_id).maybeSingle();
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: (company?.name as string) ?? "",
    expiresAt: row.expires_at,
  };
}

export interface SupportOverview {
  people: { name: string; email: string; jobTitle: string | null; status: string }[];
  sites: { id: string; name: string; status: string; city: string | null }[];
  openSessions: number;
  pendingTimesheets: number;
  hoursThisWeek: number;
}

/**
 * What support actually needs to answer a phone call.
 *
 * Deliberately not the customer's whole application. Rendering every screen
 * against another tenant would mean every query in the product bypassing RLS,
 * which is the regression this issue was written to avoid. This is a read-only
 * panel: who is in the company, where they work, what is waiting, and whether
 * anybody is clocked in right now.
 */
export async function getSupportOverview(companyId: string): Promise<SupportOverview | null> {
  if (!(await getSupportSession(companyId))) return null;

  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: people }, { data: sites }, { data: open }, { data: timesheets }, { data: entries }] =
    await Promise.all([
      admin
        .from("company_memberships")
        .select("job_title,status,users!company_memberships_user_id_fkey(name,email)")
        .eq("company_id", companyId),
      admin.from("sites").select("id,name,status,address").eq("company_id", companyId).order("name"),
      admin.from("time_sessions").select("id").eq("company_id", companyId).is("ended_at", null),
      admin.from("timesheets").select("id").eq("company_id", companyId).eq("status", "submitted"),
      admin
        .from("timesheet_entries")
        .select("starts_at,ends_at,break_minutes")
        .eq("company_id", companyId)
        .gte("starts_at", weekAgo),
    ]);

  type PersonRow = { job_title: string | null; status: string; users: { name: string; email: string } | { name: string; email: string }[] | null };
  type SiteRow = { id: string; name: string; status: string; address: { city?: string } | null };
  type EntryRow = { starts_at: string; ends_at: string; break_minutes: number | null };

  const minutes = ((entries ?? []) as EntryRow[]).reduce((total, row) => {
    const span = (new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60_000;
    return total + Math.max(0, span - (row.break_minutes ?? 0));
  }, 0);

  return {
    people: ((people ?? []) as PersonRow[]).map((row) => {
      const person = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        name: person?.name ?? "",
        email: person?.email ?? "",
        jobTitle: row.job_title,
        status: row.status,
      };
    }).sort((a, b) => a.name.localeCompare(b.name)),
    sites: ((sites ?? []) as SiteRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      city: row.address?.city ?? null,
    })),
    openSessions: (open ?? []).length,
    pendingTimesheets: (timesheets ?? []).length,
    hoursThisWeek: Math.round(minutes / 60),
  };
}
