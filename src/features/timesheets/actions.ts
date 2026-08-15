"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";

/**
 * Typed keys, never sentences.
 *
 * A server action cannot know the caller's locale, so a message composed here
 * would arrive in English on a Polish phone. The screen translates the key.
 */
export type TimesheetMessageKey =
  | "submitted"
  | "nothingToSubmit"
  | "alreadySubmitted"
  | "approved"
  | "rejected"
  | "notAllowed"
  | "notSubmitted"
  | "ownTimesheet"
  | "nothingSelected"
  | "unavailable"
  | "entrySaved"
  | "entryApproved"
  | "notAllowedToEdit"
  | "invalidTime"
  | "invalidBreak"
  | "breakTooLong"
  | "failed";

export type TimesheetActionResult = { ok: boolean; message: TimesheetMessageKey };

/**
 * One outcome per timesheet, because a batch does not succeed or fail as a unit.
 *
 * Approving fourteen weeks and reporting a single "done" hides the two that
 * were refused, and a supervisor closing the month would never learn that two
 * people are still unpaid. Each week reports for itself.
 */
export interface TimesheetReviewOutcome {
  timesheetId: string;
  employee: string;
  ok: boolean;
  message: TimesheetMessageKey;
}

export type TimesheetBatchResult = {
  approved: number;
  rejected: number;
  failed: number;
  outcomes: TimesheetReviewOutcome[];
};

const managerRoles = ["owner", "admin", "administrator", "manager", "supervisor"];

async function context() {
  const result = await requireActiveCompany();
  return { ...result, isManager: result.session.activeCompany!.roles.some((role) => managerRoles.includes(role)) };
}

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

/** `HH:MM` applied to the calendar day the entry already sits on. */
function atTimeOfDay(day: Date, time: string): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export async function submitTimesheetAction(): Promise<TimesheetActionResult> {
  const { session, companyId } = await context();
  const supabase = await createClient();
  const start = mondayOf(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const { data: sheet } = await supabase
    .from("timesheets")
    .select("id,status")
    .eq("company_id", companyId)
    .eq("user_id", session.user.id)
    .eq("period_start", toDateKey(start))
    .eq("period_end", toDateKey(end))
    .maybeSingle();
  if (!sheet) return { ok: false, message: "nothingToSubmit" };
  if (sheet.status !== "draft" && sheet.status !== "rejected") return { ok: false, message: "alreadySubmitted" };

  const { error } = await supabase.from("timesheets").update({ status: "submitted", submitted_at: new Date().toISOString() }).eq("id", sheet.id);
  if (error) return { ok: false, message: "failed" };

  revalidatePath("/dashboard/timesheets");
  return { ok: true, message: "submitted" };
}

interface SheetRow {
  id: string;
  status: string;
  user_id: string;
  users: { name: string } | { name: string }[] | null;
}

function nameOf(row: SheetRow): string {
  const users = row.users;
  return (Array.isArray(users) ? users[0]?.name : users?.name) ?? "Unknown";
}

/**
 * Reviews a batch in one gesture (#57).
 *
 * The previous screen could only act when every visible entry belonged to the
 * same timesheet, which in a twenty-person company meant filtering by person
 * twenty times to close a month. Nobody does that weekly, so hours stayed in
 * `submitted` and the report — which counts approved minutes only — read lower
 * than the work that actually happened.
 *
 * Sequential rather than `Promise.all`: these are writes against rows a
 * supervisor is looking at, and a predictable order makes a partial failure
 * legible. Fourteen weeks is not a throughput problem.
 */
export async function reviewTimesheetsAction(
  timesheetIds: string[],
  decision: "approved" | "rejected",
): Promise<TimesheetBatchResult> {
  const { session, companyId, isManager } = await context();
  const empty: TimesheetBatchResult = { approved: 0, rejected: 0, failed: 0, outcomes: [] };

  if (!timesheetIds.length) return { ...empty, failed: 0, outcomes: [] };
  if (!isManager) {
    return {
      ...empty,
      failed: timesheetIds.length,
      outcomes: timesheetIds.map((id) => ({ timesheetId: id, employee: "", ok: false, message: "notAllowed" as const })),
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheets")
    .select("id,status,user_id,users!timesheets_user_id_fkey(name)")
    .eq("company_id", companyId)
    .in("id", timesheetIds);

  const rows = new Map(((data ?? []) as SheetRow[]).map((row) => [row.id, row]));
  const outcomes: TimesheetReviewOutcome[] = [];

  for (const id of timesheetIds) {
    const row = rows.get(id);
    if (!row) {
      outcomes.push({ timesheetId: id, employee: "", ok: false, message: "unavailable" });
      continue;
    }
    const employee = nameOf(row);
    if (row.status !== "submitted") {
      outcomes.push({ timesheetId: id, employee, ok: false, message: "notSubmitted" });
      continue;
    }

    // Checked here so the reviewer reads a sentence instead of a database
    // error, but the rule itself lives in a trigger — this branch is a
    // courtesy, not the control.
    if (row.user_id === session.user.id && !session.activeCompany!.roles.includes("owner")) {
      outcomes.push({ timesheetId: id, employee, ok: false, message: "ownTimesheet" });
      continue;
    }

    // Entries first, sheet last — so a half-done review stays visible. The
    // queue is driven by the sheet's status, so if the second write fails the
    // week is still sitting there to be retried, and the retry finishes it.
    // Flipping the sheet first would drop it out of the queue with its minutes
    // still counted as pending, and nobody would think to go looking.
    const { error: entriesError } = await supabase.from("timesheet_entries").update({ status: decision }).eq("timesheet_id", id);
    if (entriesError) {
      outcomes.push({ timesheetId: id, employee, ok: false, message: "failed" });
      continue;
    }

    const { error: sheetError } = await supabase.from("timesheets").update({ status: decision }).eq("id", id);
    if (sheetError) {
      outcomes.push({ timesheetId: id, employee, ok: false, message: "failed" });
      continue;
    }

    outcomes.push({ timesheetId: id, employee, ok: true, message: decision === "approved" ? "approved" : "rejected" });
  }

  revalidatePath("/dashboard/timesheets");
  revalidatePath("/dashboard/reports");

  return {
    approved: outcomes.filter((outcome) => outcome.ok && outcome.message === "approved").length,
    rejected: outcomes.filter((outcome) => outcome.ok && outcome.message === "rejected").length,
    failed: outcomes.filter((outcome) => !outcome.ok).length,
    outcomes,
  };
}

export async function approveTimesheetAction(timesheetId: string) {
  return reviewTimesheetsAction([timesheetId], "approved");
}
export async function rejectTimesheetAction(timesheetId: string) {
  return reviewTimesheetsAction([timesheetId], "rejected");
}

export interface EditEntryInput {
  entryId: string;
  /** Time of day, `HH:MM`. The calendar day comes from the entry itself. */
  startTime: string;
  endTime: string;
  breakMinutes: number;
  taskId: string | null;
  siteId: string | null;
  notes: string;
}

/**
 * Corrects an entry that came in wrong from the field (#56).
 *
 * Until now `save()` closed the dialog, printed "ready for backend
 * integration", and wrote nothing — so the break left at zero, the swapped
 * site, the clock left running until nine at night could only be fixed in the
 * database by hand.
 *
 * Who may change what is decided by a trigger, not here. This checks the same
 * things only so the answer arrives as a sentence rather than a Postgres error;
 * removing these branches would change the wording of a refusal, never whether
 * it happens.
 */
export async function editTimeEntryAction(input: EditEntryInput): Promise<TimesheetActionResult> {
  const { companyId } = await context();
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from("timesheet_entries")
    .select("id,starts_at,status")
    .eq("company_id", companyId)
    .eq("id", input.entryId)
    .maybeSingle();
  if (!entry) return { ok: false, message: "unavailable" };
  if (entry.status === "approved") return { ok: false, message: "entryApproved" };

  // The date is taken from the row, never from the form. The dialog edits a
  // time of day; letting it also move the entry to another day would silently
  // shift hours into a different week — and possibly a different timesheet from
  // the one they belong to.
  const day = new Date(entry.starts_at as string);
  const startsAt = atTimeOfDay(day, input.startTime);
  const endsAt = atTimeOfDay(day, input.endTime);
  if (!startsAt || !endsAt) return { ok: false, message: "invalidTime" };

  // An overnight shift ends "before" it starts on the clock face. Rolling the
  // end into the next day is the reading that matches how people work; refusing
  // it would make night shifts unrecordable.
  if (endsAt <= startsAt) endsAt.setDate(endsAt.getDate() + 1);

  const workedMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
  if (!Number.isFinite(input.breakMinutes) || input.breakMinutes < 0) return { ok: false, message: "invalidBreak" };
  // A break longer than the shift would net to negative minutes, which the
  // report's `greatest(0, …)` would swallow — the total would just be short.
  if (input.breakMinutes >= workedMinutes) return { ok: false, message: "breakTooLong" };

  const { error } = await supabase
    .from("timesheet_entries")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      break_minutes: input.breakMinutes,
      task_id: input.taskId || null,
      site_id: input.siteId || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", input.entryId);
  if (error) return { ok: false, message: "notAllowedToEdit" };

  revalidatePath("/dashboard/timesheets");
  revalidatePath("/dashboard/reports");
  return { ok: true, message: "entrySaved" };
}
