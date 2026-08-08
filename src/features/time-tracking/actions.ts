"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";

export type LogTimeEntryState = { status: "idle" | "success" | "error"; message: string };

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
  const projectId = String(formData.get("projectId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  // Optional. Office work, workshop time and travel are real hours without a
  // chantier — requiring one would push people to pick a wrong site rather
  // than none, which is worse for the report than an honest blank.
  const siteId = String(formData.get("siteId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim();

  if (!date || !startTime || !endTime || !projectId || !taskId) {
    return { status: "error", message: "Fill in the date, times, project, and task." };
  }

  const startsAt = new Date(`${date}T${startTime}:00`);
  const endsAt = new Date(`${date}T${endTime}:00`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return { status: "error", message: "End time must be after start time." };
  }

  const supabase = await createClient();
  const timesheetId = await findOrCreateTimesheet(companyId, session.user.id, startsAt);

  const { error } = await supabase.from("timesheet_entries").insert({
    company_id: companyId,
    timesheet_id: timesheetId,
    project_id: projectId,
    site_id: siteId,
    task_id: taskId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    break_minutes: 0,
    notes: notes || null,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/dashboard/time");
  return { status: "success", message: "Entry saved." };
}

/**
 * Where the hour was worked, recorded at the moment it is logged (#55).
 *
 * Until this existed, every entry made through the app had a null `site_id` and
 * vanished from the hours-by-chantier report without any error — the total was
 * simply smaller. The seed filled the column directly, which is why nobody
 * noticed.
 */
export async function logTimerSessionAction(input: { projectId: string; taskId: string; siteId?: string | null; startedAt: string; notes: string; latitude?: number; longitude?: number }): Promise<LogTimeEntryState> {
  const { session, companyId } = await requireActiveCompany();
  if (!input.projectId || !input.taskId) return { status: "error", message: "Select a project and task before stopping the timer." };

  const startsAt = new Date(input.startedAt);
  const endsAt = new Date();
  if (Number.isNaN(startsAt.getTime()) || endsAt <= startsAt) {
    return { status: "error", message: "Session was too short to save." };
  }

  const supabase = await createClient();
  const timesheetId = await findOrCreateTimesheet(companyId, session.user.id, startsAt);

  // Never trust client-supplied coordinates without re-checking consent
  // server-side — the toggle in Settings is the source of truth, not
  // whatever the browser happened to send.
  const { data: settings } = await supabase.from("user_settings").select("location_consent").eq("user_id", session.user.id).maybeSingle();
  const hasConsent = settings?.location_consent ?? false;

  const { error } = await supabase.from("timesheet_entries").insert({
    company_id: companyId,
    timesheet_id: timesheetId,
    project_id: input.projectId,
    site_id: input.siteId ?? null,
    task_id: input.taskId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    break_minutes: 0,
    notes: input.notes.trim() || null,
    start_latitude: hasConsent ? input.latitude ?? null : null,
    start_longitude: hasConsent ? input.longitude ?? null : null,
  });
  if (error) return { status: "error", message: error.message };

  revalidatePath("/dashboard/time");
  return { status: "success", message: "Session saved." };
}
