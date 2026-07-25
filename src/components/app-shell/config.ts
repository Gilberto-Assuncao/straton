import type { AppCompanyOption, AppNavigationItem, AppUserSummary } from "./types";

const adminRoles = ["owner", "admin", "administrator"];
const managerRoles = [...adminRoles, "manager", "supervisor"];

export const defaultAppNavigation: AppNavigationItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "menu", section: "general" },
  { id: "map", label: "Live Map", href: "/dashboard/map", icon: "location", section: "general" },

  { id: "time", label: "Time Tracking", href: "/dashboard/time", icon: "check", section: "operations" },
  { id: "timesheets", label: "Timesheets", href: "/dashboard/timesheets", icon: "check", section: "operations", badge: "approvals" },
  { id: "field-reports", label: "Field Reports", href: "/dashboard/field-reports", icon: "check", section: "operations" },
  { id: "teams", label: "Teams", href: "/dashboard/teams", icon: "menu", section: "operations", roles: managerRoles },
  { id: "projects", label: "Projects", href: "/dashboard/projects", icon: "chevron", section: "operations" },
  { id: "sites", label: "Sites", href: "/dashboard/sites", icon: "location", section: "operations" },
  { id: "reports", label: "Reports", href: "/dashboard/reports", icon: "chevron", section: "operations", roles: managerRoles },

  { id: "finance", label: "Payroll & Accounting", href: "/dashboard/finance", icon: "plus", section: "finance", roles: [...adminRoles, "hr", "finance"], badge: "divergences" },
  { id: "expenses", label: "Expenses", href: "/dashboard/expenses", icon: "plus", disabled: true, section: "finance", roles: [...adminRoles, "hr", "finance"] },

  { id: "workforce", label: "Workforce", href: "/dashboard/workforce", icon: "menu", section: "company", roles: managerRoles },
  { id: "companies", label: "Companies & Partners", href: "/dashboard/companies", icon: "menu", section: "company", roles: adminRoles },
  { id: "roster", label: "Roster", href: "/dashboard/companies/roster", icon: "menu", section: "company", roles: adminRoles },
  { id: "connect", label: "NEXTIME Connect", href: "/dashboard/connect", icon: "plus", disabled: true, section: "company", roles: adminRoles },
  { id: "marketplace", label: "Marketplace", href: "/dashboard/marketplace", icon: "search", disabled: true, section: "company", roles: adminRoles },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "menu", section: "company", roles: adminRoles },
];
export const demoCompanies: AppCompanyOption[] = [{ id:"demo-belnex",name:"Belnex Energy (Demo)" },{ id:"demo-geotech",name:"GeoTech (Demo)" }];
export const demoAppUser: AppUserSummary = { name:"Gilberto Assunção",email:"Demonstration account",initials:"GA" };
