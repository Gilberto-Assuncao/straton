import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import type { AvailabilityConflict, AvailabilityKind, AvailabilityReason, AvailabilityRecord } from "./types";

export type { AvailabilityConflict, AvailabilityRecord } from "./types";
export { AVAILABILITY_KINDS, AVAILABILITY_REASONS } from "./types";

const MANAGER_ROLES = ["owner", "admin", "administrator", "manager"];

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface AvailabilityRow {
  id: string;
  company_membership_id: string;
  starts_at: string;
  ends_at: string;
  kind: AvailabilityKind;
  reason: AvailabilityReason | null;
  note: string | null;
  company_memberships: RelatedOne<{ user_id: string; users: RelatedOne<{ name: string }> }>;
}

export interface AvailabilityView {
  records: AvailabilityRecord[];
  /** The viewer's own membership, so the form knows whose absence it is by default. */
  myMembershipId: string;
  isManager: boolean;
}

/**
 * Absences in a window, for the whole company.
 *
 * Everyone in the company can read the ranges — a supervisor who cannot see
 * that someone is away will book them anyway, which is the entire point of
 * closing this gap. The `note` is the exception: it is stripped for everyone
 * but the person and their managers. RLS is per-row and cannot do that, so it
 * happens here, at the one place every reader goes through.
 */
/**
 * Looks back a week rather than only forward: an absence that ended yesterday
 * still explains the hours missing from last week's timesheet, and hiding it
 * the moment it ends turns that into a mystery.
 */
const LOOK_BACK_DAYS = 7;
const LOOK_AHEAD_DAYS = 120;
const DAY_MS = 86_400_000;

export async function getAvailability(
  window: { lookBackDays?: number; lookAheadDays?: number } = {},
): Promise<AvailabilityView> {
  // Read the clock here, not in the page: calling it during render is impure,
  // and the window is a property of the query rather than of the layout.
  const now = Date.now();
  const fromISO = new Date(now - (window.lookBackDays ?? LOOK_BACK_DAYS) * DAY_MS).toISOString();
  const toISO = new Date(now + (window.lookAheadDays ?? LOOK_AHEAD_DAYS) * DAY_MS).toISOString();

  const { companyId, session } = await requireActiveCompany();
  const membership = session.activeCompany;
  const isManager = Boolean(membership?.roles.some((role) => MANAGER_ROLES.includes(role)));
  const myMembershipId = membership?.membershipId ?? "";

  const supabase = await createClient();
  const { data } = await supabase
    .from("worker_availability")
    .select(
      "id,company_membership_id,starts_at,ends_at,kind,reason,note,company_memberships!inner(user_id,users!company_memberships_user_id_fkey(name))",
    )
    .eq("company_id", companyId)
    .lt("starts_at", toISO)
    .gt("ends_at", fromISO)
    .order("starts_at");

  const records = ((data ?? []) as AvailabilityRow[]).map((row) => {
    const own = row.company_membership_id === myMembershipId;
    const membershipRow = first(row.company_memberships);
    return {
      id: row.id,
      membershipId: row.company_membership_id,
      personName: (membershipRow ? first(membershipRow.users)?.name : null) ?? "",
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      kind: row.kind,
      reason: row.reason,
      note: own || isManager ? row.note : null,
      canManage: own || isManager,
    };
  });

  return { records, myMembershipId, isManager };
}

/** People a manager may record an absence for. Just themselves, for everyone else. */
export async function getSchedulablePeople(): Promise<{ membershipId: string; name: string }[]> {
  const { companyId, session } = await requireActiveCompany();
  const membership = session.activeCompany;
  const isManager = Boolean(membership?.roles.some((role) => MANAGER_ROLES.includes(role)));
  if (!isManager) {
    return membership ? [{ membershipId: membership.membershipId, name: session.user.name }] : [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("company_memberships")
    .select("id,users!company_memberships_user_id_fkey(name)")
    .eq("company_id", companyId)
    .eq("status", "active");

  type Row = { id: string; users: RelatedOne<{ name: string }> };
  return ((data ?? []) as Row[])
    .map((row) => ({ membershipId: row.id, name: first(row.users)?.name ?? "" }))
    .filter((person) => person.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Who among these people is not free in this window.
 *
 * Thin on purpose: the precedence between a declared absence and a declared
 * availability is settled in `public.availability_conflicts`, in the database,
 * because the agenda, the bulk scheduler and any later conflict report all need
 * the same answer and three implementations would be three chances to disagree
 * about who is actually away.
 */
export async function findAvailabilityConflicts(
  membershipIds: string[],
  startsAtISO: string,
  endsAtISO: string,
): Promise<AvailabilityConflict[]> {
  if (membershipIds.length === 0) return [];
  await requireActiveCompany();

  const supabase = await createClient();
  const { data } = await supabase.rpc("availability_conflicts", {
    p_membership_ids: membershipIds,
    p_starts_at: startsAtISO,
    p_ends_at: endsAtISO,
  });

  type Row = { company_membership_id: string; starts_at: string; ends_at: string; reason: AvailabilityReason | null };
  return ((data ?? []) as Row[]).map((row) => ({
    membershipId: row.company_membership_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    reason: row.reason,
  }));
}
