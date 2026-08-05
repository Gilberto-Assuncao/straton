import type { AppCompanyOption, AppNavigationItem, AppUserSummary } from "./types";

const adminRoles = ["owner", "admin", "administrator"];
const managerRoles = [...adminRoles, "manager", "supervisor"];

export const defaultAppNavigation: AppNavigationItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", section: "general" },
  { id: "map", label: "Live Map", href: "/dashboard/map", icon: "globe", section: "general" },

  // First in Operations on purpose: the agenda is what everything else in this
  // section follows from — hours are logged against work that was scheduled.
  { id: "agenda", label: "Agenda", href: "/dashboard/agenda", icon: "calendar", section: "operations" },
  { id: "timesheets", label: "Timesheets", href: "/dashboard/timesheets", icon: "calendar", section: "operations", badge: "approvals" },
  { id: "teams", label: "Teams", href: "/dashboard/teams", icon: "people", section: "operations", roles: managerRoles },
  { id: "projects", label: "Projects", href: "/dashboard/projects", icon: "layers", section: "operations" },
  { id: "sites", label: "Sites", href: "/dashboard/sites", icon: "location", section: "operations" },
  { id: "time", label: "Time Tracking", href: "/dashboard/time", icon: "clock", section: "operations" },
  // No role restriction: everyone declares their own absences, and a page a
  // worker cannot reach is a page whose data never gets entered.
  { id: "availability", label: "Availability", href: "/dashboard/availability", icon: "calendar", section: "operations" },
  { id: "field-reports", label: "Field Reports", href: "/dashboard/field-reports", icon: "check", section: "operations" },
  { id: "reports", label: "Reports", href: "/dashboard/reports", icon: "chart", section: "operations", roles: managerRoles },

  { id: "finance", label: "Payroll & Accounting", href: "/dashboard/finance", icon: "chart", section: "finance", roles: [...adminRoles, "hr", "finance"], badge: "divergences" },
  { id: "expenses", label: "Expenses", href: "/dashboard/expenses", icon: "plus", disabled: true, section: "finance", roles: [...adminRoles, "hr", "finance"] },

  { id: "companies", label: "Companies & Partners", href: "/dashboard/companies", icon: "building", section: "company", roles: adminRoles },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "gear", section: "company", roles: adminRoles },
  { id: "workforce", label: "Workforce", href: "/dashboard/workforce", icon: "people", section: "company", roles: managerRoles },
  { id: "roster", label: "Roster", href: "/dashboard/companies/roster", icon: "menu", section: "company", roles: adminRoles },
  { id: "connect", label: "STRATON Connect", href: "/dashboard/connect", icon: "plus", disabled: true, section: "company", roles: adminRoles },
  { id: "marketplace", label: "Marketplace", href: "/dashboard/marketplace", icon: "search", disabled: true, section: "company", roles: adminRoles },
];
export const demoCompanies: AppCompanyOption[] = [{ id:"demo-belnex",name:"Belnex Energy (Demo)" },{ id:"demo-geotech",name:"GeoTech (Demo)" }];
export const demoAppUser: AppUserSummary = { name:"Gilberto Assunção",email:"Demonstration account",initials:"GA" };
