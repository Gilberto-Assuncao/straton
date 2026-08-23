import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import { WORKER_TRANSITIONS } from "./types";
import type { AgendaDay, AssignmentRecord, AssignmentStatus } from "./types";

export type { AgendaDay, AssignmentRecord, AssignmentStatus } from "./types";
export { ASSIGNMENT_STATUSES } from "./types";

const MANAGER_ROLES = ["owner", "admin", "administrator", "manager", "supervisor"];
const DAY_MS = 86_400_000;

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface AssignmentRow {
  id: string;
  title: string;
  instructions: string | null;
  starts_at: string;
  ends_at: string;
  status: AssignmentStatus;
  site_id: string | null;
  team_id: string | null;
  sites: RelatedOne<{ name: string }>;
  projects: RelatedOne<{ name: string }>;
  teams: RelatedOne<{ name: string }>;
}

interface AssigneeRow {
  assignment_id: string;
  company_membership_id: string;
  source: "direct" | "team";
  company_memberships: RelatedOne<{ user_id: string; users: RelatedOne<{ name: string }> }>;
}

export interface Agenda {
  days: AgendaDay[];
  /** Monday of the week shown, as YYYY-MM-DD. */
  weekStart: string;
  /**
   * Today's calendar date, so the view can highlight the column without
   * reading the clock during render — which is impure and flagged as such.
   */
  today: string;
  isManager: boolean;
  /** True when the viewer is only shown work they are on. */
  ownOnly: boolean;
}

/** Monday 00:00 of the week containing `date`, in the server's zone. */
function startOfWeek(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  // getDay() is 0 for Sunday; Monday-first weeks are the Belgian convention and
  // what every construction schedule in the country is drawn on.
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  return monday;
}

/**
 * A week of work.
 *
 * A supervisor sees the whole company's week; everyone else sees only the jobs
 * they are on. That split is done here rather than in RLS, because a worker
 * being *able* to read a colleague's assignment is fine — the schedule is not
 * secret — while a worker's agenda showing forty jobs that are not theirs is
 * simply a broken screen.
 */
export async function getAgenda(weekStartISO?: string): Promise<Agenda> {
  const { companyId, session } = await requireActiveCompany();
  const membership = session.activeCompany;
  const isManager = Boolean(membership?.roles.some((role) => MANAGER_ROLES.includes(role)));
  const myMembershipId = membership?.membershipId ?? "";

  const monday = startOfWeek(weekStartISO ? new Date(weekStartISO) : new Date());
  const nextMonday = new Date(monday.getTime() + 7 * DAY_MS);

  const supabase = await createClient();

  // Two queries rather than one embedded filter. Filtering on an embedded
  // resource narrows the *assignees*, not the assignments, so a job that is not
  // yours would still come back — just with an empty crew — and the shape it
  // returns does not typecheck either. Fetching the week and then its people is
  // plainer and says what it means.
  const { data: assignmentRows } = await supabase
    .from("assignments")
    .select(
      "id,title,instructions,starts_at,ends_at,status,site_id,team_id,sites(name),teams(name)",
    )
    .eq("company_id", companyId)
    .gte("starts_at", monday.toISOString())
    .lt("starts_at", nextMonday.toISOString())
    .order("starts_at");

  const weekAssignments = (assignmentRows ?? []) as AssignmentRow[];
  if (weekAssignments.length === 0) {
    return { days: emptyWeek(monday), weekStart: toDateKey(monday), today: toDateKey(new Date()), isManager, ownOnly: !isManager };
  }

  const { data: assigneeRows } = await supabase
    .from("assignment_assignees")
    .select("assignment_id,company_membership_id,source,company_memberships(user_id,users!company_memberships_user_id_fkey(name))")
    .in(
      "assignment_id",
      weekAssignments.map((row) => row.id),
    );

  const crews = new Map<string, AssigneeRow[]>();
  for (const row of (assigneeRows ?? []) as AssigneeRow[]) {
    const crew = crews.get(row.assignment_id) ?? [];
    crew.push(row);
    crews.set(row.assignment_id, crew);
  }

  /**
   * Shifts somebody has asked *you* to take (#25).
   *
   * Without this the feature has a hole with no bottom: the colleague gets an
   * ACTION_REQUIRED notification pointing at /dashboard/agenda, opens it, and
   * the shift is not there — because it is not theirs yet, and a worker's
   * agenda shows only their own. They would have been asked, told to look, and
   * shown nothing. The same shape as `nav.agenda`, one layer down.
   *
   * Only for people who are not managers; a manager already sees the week.
   */
  const askedOfMe = new Set<string>();
  if (!isManager && myMembershipId) {
    const { data: pending } = await supabase
      .from("assignment_swaps")
      .select("assignment_id")
      .eq("to_membership_id", myMembershipId)
      .in("status", ["proposed", "accepted_by_peer"]);
    for (const row of (pending ?? []) as { assignment_id: string }[]) askedOfMe.add(row.assignment_id);
  }

  const rows = weekAssignments.filter(
    (row) =>
      isManager
      || askedOfMe.has(row.id)
      || (crews.get(row.id) ?? []).some((assignee) => assignee.company_membership_id === myMembershipId),
  );

  const records: AssignmentRecord[] = rows.map((row) => {
    const crew = crews.get(row.id) ?? [];
    const mine = crew.some((assignee) => assignee.company_membership_id === myMembershipId);
    return {
      id: row.id,
      title: row.title,
      instructions: row.instructions,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: row.status,
      siteId: row.site_id,
      siteName: first(row.sites)?.name ?? null,
      projectName: first(row.projects)?.name ?? null,
      teamId: row.team_id,
      teamName: first(row.teams)?.name ?? null,
      assignees: crew.map((assignee) => {
        const cm = first(assignee.company_memberships);
        return {
          membershipId: assignee.company_membership_id,
          name: (cm ? first(cm.users)?.name : null) ?? "",
          source: assignee.source,
        };
      }),
      canManage: isManager,
      availableTransitions: isManager || mine ? WORKER_TRANSITIONS[row.status] : [],
    };
  });

  const days = emptyWeek(monday).map((day) => ({
    date: day.date,
    assignments: records.filter((record) => record.startsAt.slice(0, 10) === day.date),
  }));

  return { days, weekStart: toDateKey(monday), today: toDateKey(new Date()), isManager, ownOnly: !isManager };
}

/** Seven empty days from Monday, so a quiet week still renders as a week. */
function emptyWeek(monday: Date): AgendaDay[] {
  return Array.from({ length: 7 }, (_, index) => ({
    date: toDateKey(new Date(monday.getTime() + index * DAY_MS)),
    assignments: [],
  }));
}

/** Local calendar date, not UTC: `toISOString()` would shift the day near midnight. */
function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export interface AssignmentOptions {
  people: { membershipId: string; name: string }[];
  teams: { id: string; name: string }[];
  sites: { id: string; name: string }[];
}

export async function getAssignmentOptions(): Promise<AssignmentOptions> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [{ data: people }, { data: teams }, { data: sites }] = await Promise.all([
    supabase
      .from("company_memberships")
      .select("id,users!company_memberships_user_id_fkey(name)")
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase.from("teams").select("id,name").eq("company_id", companyId).order("name"),
    supabase.from("sites").select("id,name").eq("company_id", companyId).order("name"),
  ]);

  type PersonRow = { id: string; users: RelatedOne<{ name: string }> };
  return {
    people: ((people ?? []) as PersonRow[])
      .map((row) => ({ membershipId: row.id, name: first(row.users)?.name ?? "" }))
      .filter((person) => person.name)
      .sort((a, b) => a.name.localeCompare(b.name)),
    teams: (teams ?? []) as { id: string; name: string }[],
    sites: ((sites ?? []) as { id: string; name: string }[]).map((row) => ({
      id: row.id,
      name: row.name,
    })),
  };
}

/**
 * Whether this person currently publishes their week, and when it was last read
 * (#49, passo 2).
 *
 * The URL itself is not here and cannot be: only its digest was ever stored.
 * What the screen can honestly show is that a subscription exists, and when a
 * calendar client last collected it — which is the one thing that would make a
 * leaked link visible to the person it belongs to.
 */
export interface AgendaFeedState {
  active: boolean;
  createdAt: string | null;
  lastFetchedAt: string | null;
}

export async function getAgendaFeedState(): Promise<AgendaFeedState> {
  const { session } = await requireActiveCompany();
  const membershipId = session.activeCompany?.membershipId;
  if (!membershipId) return { active: false, createdAt: null, lastFetchedAt: null };

  const supabase = await createClient();
  const { data } = await supabase
    .from("agenda_feeds")
    .select("created_at,last_fetched_at")
    .eq("company_membership_id", membershipId)
    .is("revoked_at", null)
    .maybeSingle();

  return {
    active: Boolean(data),
    createdAt: data?.created_at ?? null,
    lastFetchedAt: data?.last_fetched_at ?? null,
  };
}

/**
 * The swap layer over the week (#25).
 *
 * Kept apart from `getAgenda` on purpose: the agenda is read by everyone on
 * every visit, and most weeks have no swap in them at all. One extra query that
 * usually returns nothing beats widening the query that always runs.
 */
export type SwapStatus = "proposed" | "accepted_by_peer" | "approved" | "rejected" | "cancelled";

export interface AgendaSwap {
  id: string;
  assignmentId: string;
  status: SwapStatus;
  fromMembershipId: string;
  fromName: string;
  toMembershipId: string;
  toName: string;
  reason: string | null;
}

export interface AgendaSwapContext {
  /** Who the viewer is, as a membership — the id every swap is keyed on. */
  viewerMembershipId: string | null;
  isManager: boolean;
  /** Swaps still being decided, by assignment id. At most one per assignment. */
  open: Record<string, AgendaSwap>;
  /** Who can be asked: everyone active in the company except the viewer. */
  colleagues: { membershipId: string; name: string }[];
}

export async function getAgendaSwapContext(): Promise<AgendaSwapContext> {
  const { companyId, session } = await requireActiveCompany();
  const membership = session.activeCompany;
  const viewerMembershipId = membership?.membershipId ?? null;
  const isManager = Boolean(membership?.roles.some((role) => MANAGER_ROLES.includes(role)));

  const supabase = await createClient();

  const [{ data: swapRows }, { data: peopleRows }] = await Promise.all([
    supabase
      .from("assignment_swaps")
      .select("id,assignment_id,status,from_membership_id,to_membership_id,reason")
      .eq("company_id", companyId)
      .in("status", ["proposed", "accepted_by_peer"]),
    supabase
      .from("company_memberships")
      .select("id,users!company_memberships_user_id_fkey(name)")
      .eq("company_id", companyId)
      .eq("status", "active"),
  ]);

  type PersonRow = { id: string; users: RelatedOne<{ name: string }> };
  // Names are resolved from this one list rather than joined onto the swap
  // twice. A swap points at two memberships and the join would be ambiguous;
  // a map is also what the colleague picker needs anyway.
  const names = new Map<string, string>();
  for (const row of (peopleRows ?? []) as PersonRow[]) {
    const name = first(row.users)?.name;
    if (name) names.set(row.id, name);
  }

  type SwapRow = {
    id: string;
    assignment_id: string;
    status: SwapStatus;
    from_membership_id: string;
    to_membership_id: string;
    reason: string | null;
  };

  const open: Record<string, AgendaSwap> = {};
  for (const row of (swapRows ?? []) as SwapRow[]) {
    open[row.assignment_id] = {
      id: row.id,
      assignmentId: row.assignment_id,
      status: row.status,
      fromMembershipId: row.from_membership_id,
      fromName: names.get(row.from_membership_id) ?? "",
      toMembershipId: row.to_membership_id,
      toName: names.get(row.to_membership_id) ?? "",
      reason: row.reason,
    };
  }

  return {
    viewerMembershipId,
    isManager,
    open,
    colleagues: [...names.entries()]
      .filter(([id]) => id !== viewerMembershipId)
      .map(([membershipId, name]) => ({ membershipId, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
