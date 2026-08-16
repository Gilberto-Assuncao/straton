"use server";

import { revalidatePath } from "next/cache";
import { log } from "@/src/infrastructure/observability/logger";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { checkClockInLocation } from "./location-check";

export type LogTimeEntryState = {
  status: "idle" | "success" | "error";
  /** null while idle. A key into `time`, never a sentence. */
  messageKey: ManualEntryMessageKey | null;
};

/**
 * Typed keys, never sentences. A server action cannot know the caller's locale,
 * so a message written here would reach a Polish phone in English.
 */
export type TimerMessageKey =
  | "started"
  | "stopped"
  | "confirmed"
  | "alreadyRunning"
  | "nothingRunning"
  | "selectProjectAndTask"
  | "endBeforeStart"
  | "savedButStillOpen"
  | "failed";

export type TimerResult = { ok: boolean; message: TimerMessageKey };

/**
 * The manual entry form, which the timer keys do not cover: it is the other
 * half of this screen and fails for its own reasons.
 */
export type ManualEntryMessageKey =
  | "manualMissingFields"
  | "manualEndBeforeStart"
  | "manualSaved"
  | "manualSaveFailed";

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1) - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function findOrCreateTimesheet(companyId: string, userId: string, reference: Date) {
  const supabase = await createClient();
  const start = mondayOf(reference);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const periodStart = toDateKey(start);
  const periodEnd = toDateKey(end);

  const { data: existing } = await supabase
    .from("timesheets")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("timesheets")
    .insert({ company_id: companyId, user_id: userId, period_start: periodStart, period_end: periodEnd })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Unable to open a timesheet for this week.");
  return created.id as string;
}

export async function logTimeEntryAction(_: LogTimeEntryState, formData: FormData): Promise<LogTimeEntryState> {
  const { session, companyId } = await requireActiveCompany();

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  // Optional, and for the same reason as the site below. A company that has not
  // written down any tasks still has people working; requiring one meant the
  // clock could not be started at all, because the dropdown was empty and there
  // was nothing to choose. The column is nullable — the obligation was invented
  // here, not by the model.
  const taskId = String(formData.get("taskId") ?? "") || null;
  // Optional. Office work, workshop time and travel are real hours without a
  // chantier — requiring one would push people to pick a wrong site rather
  // than none, which is worse for the report than an honest blank.
  const siteId = String(formData.get("siteId") ?? "") || null;
  // Optional in the same way, and usually not asked for at all: the selector
  // only appears when the location has more than one subdivision, and the
  // database fills in the single one when it does not. A question with one
  // possible answer is not a question.
  const siteAreaId = String(formData.get("siteAreaId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!date || !startTime || !endTime) {
    return { status: "error", messageKey: "manualMissingFields" };
  }

  const startsAt = new Date(`${date}T${startTime}:00`);
  const endsAt = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { status: "error", messageKey: "manualEndBeforeStart" };
  }

  const supabase = await createClient();
  const timesheetId = await findOrCreateTimesheet(companyId, session.user.id, startsAt);

  const { error } = await supabase.from("timesheet_entries").insert({
    company_id: companyId,
    timesheet_id: timesheetId,
    site_id: siteId,
    site_area_id: siteAreaId,
    task_id: taskId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    break_minutes: 0,
    notes: notes || null,
  });
  if (error) {
    // #27: the code goes to the log, the Postgres text never to the screen.
    log.error({ event: "manual_entry_insert_failed", source: "logTimeEntryAction", code: error.code }, error);
    return { status: "error", messageKey: "manualSaveFailed" };
  }

  revalidatePath("/dashboard/time");
  return { status: "success", messageKey: "manualSaved" };
}

/**
 * Starting the clock writes a row (#60).
 *
 * The whole point of the issue. The timer used to live in React state and
 * nothing was written until Stop, so a locked phone, a discarded tab or a flat
 * battery erased the day with no error and no record — the eight hours simply
 * never happened.
 *
 * `started_at` is deliberately not sent. The database stamps it, because a
 * start time the client can choose is a start time the client can backdate,
 * and this row becomes paid hours the moment it closes.
 */
export async function startSessionAction(input: {
  /** Optional: a company with nothing written down still works. */
  taskId?: string | null;
  siteId?: string | null;
  siteAreaId?: string | null;
  notes?: string;
  /**
   * Where the phone said it was, at the moment the button was pressed.
   *
   * Used here and then dropped. What gets written is whether it matched the
   * work location — see `location-check.ts`. There is no column for a person's
   * position, deliberately: the company's question is "did this shift start
   * where the work is", and answering it does not require keeping a trail.
   */
  coordinates?: { latitude: number; longitude: number } | null;
}): Promise<TimerResult> {
  const { session, companyId } = await requireActiveCompany();
  // Nothing is required to start the clock. Asking someone to "select a project
  // and task" when the company has neither is a message with no action behind
  // it — the fourth time a mandatory field with no valid value became a dead
  // end. What the hours are attached to can be filled in later; the hours
  // themselves cannot be recovered once the shift is over.

  const supabase = await createClient();

  const { data: site } = input.siteId
    ? await supabase.from("sites").select("latitude,longitude").eq("company_id", companyId).eq("id", input.siteId).maybeSingle()
    : { data: null };
  const check = checkClockInLocation(input.coordinates, site);

  const { error } = await supabase.from("time_sessions").insert({
    company_id: companyId,
    user_id: session.user.id,
    task_id: input.taskId || null,
    site_id: input.siteId || null,
    site_area_id: input.siteAreaId || null,
    notes: input.notes?.trim() || null,
    started_within_site: check.withinSite,
    start_distance_m: check.distanceMetres,
  });

  if (error) {
    // The partial unique index refuses a second open session. That is not a
    // fault to report as one: it means another device already has the clock
    // running, and the right answer is to show that session rather than an
    // error nobody can act on.
    if (error.code === "23505") return { ok: false, message: "alreadyRunning" };
    return { ok: false, message: "failed" };
  }

  revalidatePath("/dashboard/time");
  return { ok: true, message: "started" };
}

/**
 * Stopping converts the session into hours.
 *
 * `endedAt` is optional and exists for the person who forgot to stop: they can
 * say they actually finished at five rather than being handed the fourteen
 * hours the clock ran. Correcting downwards only ever removes hours, so there
 * is nothing to guard against; the database refuses anything in the future.
 */
export async function stopSessionAction(input?: { endedAt?: string }): Promise<TimerResult> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: open } = await supabase
    .from("time_sessions")
    .select("id,started_at,task_id,site_id,site_area_id,notes")
    .eq("company_id", companyId)
    .eq("user_id", session.user.id)
    .is("ended_at", null)
    .maybeSingle();
  if (!open) return { ok: false, message: "nothingRunning" };

  const startsAt = new Date(open.started_at as string);
  const endsAt = input?.endedAt ? new Date(input.endedAt) : new Date();
  if (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) return { ok: false, message: "endBeforeStart" };

  // The break is the employer's rule, applied on the way out. A worker on a
  // phone at the end of a shift should not be doing arithmetic about lunch.
  const { data: settings } = await supabase
    .from("company_settings")
    .select("default_break_minutes")
    .eq("company_id", companyId)
    .maybeSingle();
  const workedMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
  // Never more break than shift: a short session would otherwise net to
  // negative minutes, which the report floors to zero and silently loses.
  const breakMinutes = Math.min(settings?.default_break_minutes ?? 0, Math.max(0, workedMinutes - 1));

  const timesheetId = await findOrCreateTimesheet(companyId, session.user.id, startsAt);

  // The entry first, then the session. If the order were reversed and this
  // failed, the session would already be closed and the hours would exist
  // nowhere — the exact disappearance this issue is about.
  const { data: entry, error: entryError } = await supabase
    .from("timesheet_entries")
    .insert({
      company_id: companyId,
      timesheet_id: timesheetId,
      site_id: open.site_id,
      // Carried from the session rather than resolved again. The subdivision
      // was decided when the clock started; working it out at Stop would use
      // today's subdivisions to describe a shift that began under yesterday's.
      site_area_id: open.site_area_id,
      task_id: open.task_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      break_minutes: breakMinutes,
      notes: (open.notes as string | null) ?? null,
    })
    .select("id")
    .single();
  if (entryError || !entry) return { ok: false, message: "failed" };

  const { error: closeError } = await supabase
    .from("time_sessions")
    .update({ ended_at: endsAt.toISOString(), timesheet_entry_id: entry.id })
    .eq("id", open.id);
  // The hours are saved either way; a session left open here shows up as a
  // clock still running, which is visible and fixable, rather than lost time.
  if (closeError) return { ok: false, message: "savedButStillOpen" };

  revalidatePath("/dashboard/time");
  revalidatePath("/dashboard/timesheets");
  return { ok: true, message: "stopped" };
}

/**
 * "Yes, I really am still working."
 *
 * Recorded rather than inferred. Without it the only evidence that a long
 * session was deliberate would be the number of hours itself, which is the
 * thing in question.
 */
export async function confirmSessionAction(): Promise<TimerResult> {
  const { session, companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { error } = await supabase
    .from("time_sessions")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("user_id", session.user.id)
    .is("ended_at", null);
  if (error) return { ok: false, message: "failed" };

  revalidatePath("/dashboard/time");
  return { ok: true, message: "confirmed" };
}
