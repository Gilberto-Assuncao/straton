import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";

type RelatedOne<T> = T | T[] | null;
function first<T>(value: RelatedOne<T>): T | null { return Array.isArray(value) ? (value[0] ?? null) : value; }

/**
 * Who is clocked in right now, grouped by the site they are working at (#5, #61).
 *
 * This used to read the last *completed* entry of the day and plot each person
 * at the coordinates their phone reported when they pressed Start. Two things
 * were wrong with that.
 *
 * It was not live. An entry only exists once a session is stopped, so the map
 * showed where people had already finished. Open sessions now exist as rows
 * (#60), which is what makes the real question answerable.
 *
 * And it tracked people. A coordinate does not say "at the Le Parc site" — it
 * says where this person was, to the metre, at that time. Pick from home, from
 * a café, from a doctor's waiting room, and it was recorded. The pin belongs to
 * the chantier, which is company data with a known address, not to the worker.
 */
export interface LivePresencePerson {
  userId: string;
  name: string;
  startedAt: string;
  /** Computed on the server, so no component reads the clock while rendering. */
  minutesElapsed: number;
}

export interface LivePresenceSite {
  /** Null for people working without a chantier — office, workshop, travel. */
  siteId: string | null;
  siteName: string | null;
  projectName: string | null;
  latitude: number | null;
  longitude: number | null;
  people: LivePresencePerson[];
}

interface SessionRow {
  id: string;
  user_id: string;
  started_at: string;
  users: RelatedOne<{ name: string }>;
  sites: RelatedOne<{ id: string; name: string; latitude: number | null; longitude: number | null; projects: RelatedOne<{ name: string }> }>;
}

export async function getLivePresence(): Promise<LivePresenceSite[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  // No role filter here. The policy on `time_sessions` already decides: your
  // own sessions, plus the company's if you review hours. A colleague opening
  // this page sees only themselves, which is the correct answer rather than an
  // error page.
  const { data, error } = await supabase
    .from("time_sessions")
    .select("id,user_id,started_at,users!time_sessions_user_id_fkey(name),sites(id,name,latitude,longitude)")
    .eq("company_id", companyId)
    .is("ended_at", null)
    .order("started_at", { ascending: true });
  if (error) throw new Error("Unable to load live presence.");

  const now = Date.now();
  const bySite = new Map<string, LivePresenceSite>();

  for (const row of (data ?? []) as SessionRow[]) {
    const user = first(row.users);
    const site = first(row.sites);
    const key = site?.id ?? "";

    if (!bySite.has(key)) {
      bySite.set(key, {
        siteId: site?.id ?? null,
        siteName: site?.name ?? null,
        projectName: site ? first(site.projects)?.name ?? null : null,
        latitude: site?.latitude ?? null,
        longitude: site?.longitude ?? null,
        people: [],
      });
    }

    bySite.get(key)!.people.push({
      userId: row.user_id,
      name: user?.name ?? "Unknown",
      startedAt: row.started_at,
      minutesElapsed: Math.max(0, Math.round((now - new Date(row.started_at).getTime()) / 60000)),
    });
  }

  // Busiest site first; the group with no chantier last, whatever its size —
  // it is a caveat to the picture, not a place on it.
  return [...bySite.values()].sort((a, b) => {
    if (!a.siteId) return 1;
    if (!b.siteId) return -1;
    return b.people.length - a.people.length;
  });
}
