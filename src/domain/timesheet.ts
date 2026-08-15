import type { SiteId } from "./site"; import type { CompanyId } from "./company"; import type { EntityId, Timestamp } from "./shared"; import type { UserId } from "./user";
export type TimesheetId = EntityId<"Timesheet">; export type TimesheetEntryId = EntityId<"TimesheetEntry">;
export enum TimesheetStatus { Draft = "draft", Submitted = "submitted", Approved = "approved", Rejected = "rejected" }
export interface TimesheetEntry { id: TimesheetEntryId; timesheetId: TimesheetId; siteId?: SiteId; startsAt: Timestamp; endsAt: Timestamp; breakMinutes: number; notes?: string }
export interface Timesheet { id: TimesheetId; companyId: CompanyId; userId: UserId; periodStart: Timestamp; periodEnd: Timestamp; status: TimesheetStatus; entries: TimesheetEntry[]; submittedAt?: Timestamp; reviewedBy?: UserId; reviewedAt?: Timestamp }
