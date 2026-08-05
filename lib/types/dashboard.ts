export type KpiTrend = "positive" | "neutral" | "attention";
export type KpiIcon = "clock" | "users" | "approval" | "projects";
export type TimesheetStatus = "Approved" | "Pending" | "Rejected";
export type TeamActivityType = "shift_started" | "timesheet_submitted" | "project_updated" | "timesheet_approved";

export type DashboardKpi = { id: string; label: string; value: string; comparison: string; state: KpiTrend; icon: KpiIcon };
export type WeeklyHoursEntry = { day: string; fullDay: string; hours: number };
export type TeamActivityItem = { id: string; person: string; action: string; context: string; time: string; type: TeamActivityType };
export type RecentTimesheet = { id: string; employee: string; project: string; hours: number; date: string; status: TimesheetStatus };
export type QuickAction = { label: string; href: string };
