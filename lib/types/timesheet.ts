export type ApprovalStatus = "draft" | "submitted" | "approved" | "rejected";
export type EntryCategory = "regular" | "overtime" | "break";
export type WeekRange = { id: string; label: string; startDate: string; endDate: string };
/** A pickable thing, by id. The names alone cannot be saved back. */
export type Option = { id: string; name: string };

export type TimesheetEntry = {
  id: string; timesheetId: string; employee: string;
  /** Formatted for reading. `startsAtIso` is what edits are rebuilt from. */
  date: string; startsAtIso: string;
  location: string; task: string;
  taskId: string | null; siteId: string | null;
  startTime: string; endTime: string; breakMinutes: number; workedMinutes: number;
  notes: string; category: EntryCategory; status: ApprovalStatus;
  /**
   * Whether this viewer may change this row, decided on the server.
   *
   * The database is the authority — an approved entry is immutable for
   * everyone, and only a manager may touch someone else's. This flag exists so
   * the screen does not offer a pencil that leads to a refusal.
   */
  canEdit: boolean;
};
export type Timesheet = { id: string; employee: string; week: WeekRange; status: ApprovalStatus; entries: TimesheetEntry[] };
export type WeekSummary = { workedMinutes: number; breakMinutes: number; overtimeMinutes: number; remainingMinutes: number };
export type DaySummary = { date: string; workedMinutes: number; breakMinutes: number; entries: number };
