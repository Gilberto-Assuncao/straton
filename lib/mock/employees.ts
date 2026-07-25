import type { Employee } from "@/lib/types/employee";

export const employees: Employee[] = [
  { id: "maya-laurent", firstName: "Maya", lastName: "Laurent", email: "maya.laurent@straton.example", phone: "+32 470 12 34 56", jobTitle: "Site Manager", team: "Operations", status: "active", employmentType: "employee", hourlyRate: 42, startDate: "2024-03-11", avatarInitials: "ML", totalHoursThisWeek: 38.5, createdAt: "2024-03-04" },
  { id: "lucas-martin", firstName: "Lucas", lastName: "Martin", email: "lucas.martin@straton.example", jobTitle: "Project Engineer", team: "Engineering", status: "active", employmentType: "employee", hourlyRate: 38, startDate: "2023-09-18", avatarInitials: "LM", totalHoursThisWeek: 40, createdAt: "2023-09-10" },
  { id: "sofia-dubois", firstName: "Sofia", lastName: "Dubois", email: "sofia.dubois@straton.example", phone: "+32 486 22 45 19", jobTitle: "Interior Designer", team: "Design", status: "active", employmentType: "contractor", hourlyRate: 51, startDate: "2025-01-06", avatarInitials: "SD", totalHoursThisWeek: 36.75, createdAt: "2024-12-18" },
  { id: "noah-janssen", firstName: "Noah", lastName: "Janssen", email: "noah.janssen@straton.example", jobTitle: "Field Technician", team: "Operations", status: "inactive", employmentType: "temporary", startDate: "2024-06-03", avatarInitials: "NJ", totalHoursThisWeek: 0, createdAt: "2024-05-26" },
  { id: "emma-peeters", firstName: "Emma", lastName: "Peeters", email: "emma.peeters@straton.example", jobTitle: "Accountant", team: "Finance", status: "invited", employmentType: "employee", startDate: "2026-08-03", avatarInitials: "EP", totalHoursThisWeek: 0, createdAt: "2026-07-18" },
  { id: "adam-wilson", firstName: "Adam", lastName: "Wilson", email: "adam.wilson@straton.example", phone: "+32 475 88 31 02", jobTitle: "Team Lead", team: "Engineering", status: "active", employmentType: "employee", hourlyRate: 46, startDate: "2022-11-14", avatarInitials: "AW", totalHoursThisWeek: 41.25, createdAt: "2022-11-07" },
];

export const employeeTeams = [...new Set(employees.map((employee) => employee.team))].sort();
