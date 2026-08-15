export type EntryStatus = "Approved" | "Pending" | "Rejected";

export type Task = { id: string; name: string };

/**
 * A finished entry, as the recent-entries list shows it (#77).
 *
 * Headlined by the work location rather than the project, which no longer
 * exists — and the location is what somebody recognises anyway: they were at
 * Grimbergen, not on an abstraction.
 *
 * Both are nullable, and that is the fix that came with the change. They used
 * to be required, so an entry missing either was dropped from the list without
 * a word — and office work has no chantier, while a company that has written
 * down no tasks has no task. The hours existed; the row just never appeared.
 */
export type TimeEntry = { id: string; location: string | null; task: string | null; durationMinutes: number; date: string; status: EntryStatus };
export type DailySummary = { workedMinutes: number; breakMinutes: number; sessions: number };
export type WeeklySummary = { workedMinutes: number; targetMinutes: number };
