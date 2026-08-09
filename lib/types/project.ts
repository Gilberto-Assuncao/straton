export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "cancelled";
export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type Client = { id: string; companyName: string; contactName: string; email: string; phone: string; country: string; vat: string; address: string };
export type ProjectMember = { id: string; name: string; role: string; initials: string };
export type ProjectBudget = { amount: number; currency: "EUR"; spent: number };
export type ProjectStatistics = { trackedHours: number; billableHours: number; entries: number; members: number };
/** `clientId` is null for internal work — the company's own site, its own maintenance. */
export type Project = { id: string; name: string; clientId: string | null; status: ProjectStatus; priority: ProjectPriority; estimatedHours: number; workedHours: number; startDate: string; endDate: string; budget: ProjectBudget; description: string; members: ProjectMember[]; statistics: ProjectStatistics };
