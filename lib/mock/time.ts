import type { DailySummary, Task, TimeEntry, WeeklySummary } from "@/lib/types/time";

export const locations = ["Construction Site A", "Residential Building", "Office Renovation"];

export const tasks: Task[] = [
  { id: "electrical-installation", name: "Electrical Installation" },
  { id: "cable-routing", name: "Cable Routing" },
  { id: "inspection", name: "Inspection" },
  { id: "maintenance", name: "Maintenance" },
  { id: "testing", name: "Testing" },
];

export const recentEntries: TimeEntry[] = [
  { id: "entry-1", location: locations[0]!, task: tasks[0]!.name, durationMinutes: 165, date: "Jul 19, 2026", status: "Approved" },
  { id: "entry-2", location: locations[1]!, task: tasks[2]!.name, durationMinutes: 120, date: "Jul 19, 2026", status: "Pending" },
  // Hours with no chantier and no task written down. They used to be dropped
  // from this list entirely, which is the bug the nullable fields fixed (#77).
  { id: "entry-3", location: null, task: null, durationMinutes: 240, date: "Jul 18, 2026", status: "Approved" },
];

export const todaySummary: DailySummary = { workedMinutes: 405, breakMinutes: 45, sessions: 4 };
export const weeklySummary: WeeklySummary = { workedMinutes: 2040, targetMinutes: 2400 };
