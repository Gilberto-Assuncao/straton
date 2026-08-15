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

  const rows = weekAssignments.filter(
    (row) =>
      isManager || (crews.get(row.id) ?? []).some((assignee) => assignee.company_membership_id === myMembershipId),
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
