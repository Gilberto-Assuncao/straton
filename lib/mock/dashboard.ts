import type { DashboardKpi, QuickAction, RecentTimesheet, TeamActivityItem, WeeklyHoursEntry } from "@/lib/types/dashboard";

export const dashboardKpis: DashboardKpi[] = [
  { id: "hours", label: "Hours This Week", value: "326h", comparison: "+8.4% from last week", state: "positive", icon: "clock" },
  { id: "employees", label: "Active Employees", value: "24", comparison: "+2 this month", state: "positive", icon: "users" },
  { id: "approvals", label: "Pending Approvals", value: "7", comparison: "Needs your attention", state: "attention", icon: "approval" },
  { id: "locations", label: "Active Projects", value: "12", comparison: "Same as last month", state: "neutral", icon: "locations" },
];

export const weeklyHours: WeeklyHoursEntry[] = [
  { day: "Mon", fullDay: "Monday", hours: 58 }, { day: "Tue", fullDay: "Tuesday", hours: 64 },
  { day: "Wed", fullDay: "Wednesday", hours: 52 }, { day: "Thu", fullDay: "Thursday", hours: 68 },
  { day: "Fri", fullDay: "Friday", hours: 61 }, { day: "Sat", fullDay: "Saturday", hours: 18 },
  { day: "Sun", fullDay: "Sunday", hours: 5 },
];

export const teamActivities: TeamActivityItem[] = [
  { id: "a1", person: "Maya Laurent", action: "started shift", context: "Brussels Office", time: "8 min ago", type: "shift_started" },
  { id: "a2", person: "Lucas Martin", action: "submitted a timesheet", context: "North Residence", time: "24 min ago", type: "timesheet_submitted" },
  { id: "a3", person: "Sofia Dubois", action: "updated project", context: "Green Tower", time: "42 min ago", type: "location_updated" },
  { id: "a4", person: "Gilberto Assunção", action: "approved a timesheet", context: "Antwerp Retail", time: "1 hr ago", type: "timesheet_approved" },
];

export const recentTimesheets: RecentTimesheet[] = [
  { id: "t1", employee: "Maya Laurent", location: "Brussels Office", hours: 38.5, date: "Jul 18, 2026", status: "Approved" },
  { id: "t2", employee: "Lucas Martin", location: "North Residence", hours: 40, date: "Jul 18, 2026", status: "Pending" },
  { id: "t3", employee: "Sofia Dubois", location: "Green Tower", hours: 36.75, date: "Jul 17, 2026", status: "Approved" },
  { id: "t4", employee: "Noah Janssen", location: "Antwerp Retail", hours: 31, date: "Jul 17, 2026", status: "Rejected" },
];

export const quickActions: QuickAction[] = [
  { label: "Add time entry", href: "/dashboard/time" },
  { label: "Add employee", href: "/dashboard/employees/new" },
  { label: "Create project", href: "/dashboard/projects" },
  { label: "Review timesheets", href: "/dashboard/timesheets" },
];
