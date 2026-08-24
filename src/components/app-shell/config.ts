import type { AppCompanyOption, AppNavigationItem, AppUserSummary } from "./types";

const adminRoles = ["owner", "admin", "administrator"];
const managerRoles = [...adminRoles, "manager", "supervisor"];

/**
 * The sidebar, grouped so it reads as the working day rather than as a list of
 * database tables (#36).
 *
 * The order inside each section is the order things happen: you are told what
 * to do, you go there, you log it, it gets paid. Fifteen entries competing for
 * the same glance is what made the old menu feel disorganised — not the number
 * of features.
 *
 * Section 6 of docs/02-architecture/SCHEDULING_AND_DELEGATION.md proposes going
 * further and folding Sites and Field Reports into Projects as tabs. That was
 * written before the site dashboard, its partner tab and the map that keys off
 * site coordinates existed. Doing it now would move routes and hide work that
 * has just landed, so this regroups without relocating anything — every page is
 * still exactly where its links point.
 *
 * Every id needs a matching `nav.<id>` message in all nine locales. That is not
 * a convention, it is enforced: DashboardShell renders t(item.id), a missing key
 * prints the raw key path rather than throwing, and
 * tests/unit/navigation-labels.test.ts is what catches it.
 */
export const defaultAppNavigation: AppNavigationItem[] = [
  // What is happening right now, and what is meant to happen.
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", section: "general" },
  { id: "agenda", label: "Agenda", href: "/dashboard/agenda", icon: "calendar", section: "general" },
  { id: "map", label: "Live Map", href: "/dashboard/map", icon: "globe", section: "general" },

  // Where the work is.
  { id: "sites", label: "Sites", href: "/dashboard/sites", icon: "location", section: "operations" },
  { id: "field-reports", label: "Field Reports", href: "/dashboard/field-reports", icon: "check", section: "operations" },

  // Who does it. `employees` is the page where people are actually managed and
  // it had no sidebar entry at all — reachable only from the dashboard and the
  // quick actions, which is how a main screen goes missing without anyone
  // filing a bug. Availability sits here rather than under Operations because
  // it is a fact about a person, not about a job.
  { id: "employees", label: "People", href: "/dashboard/employees", icon: "people", section: "team", roles: managerRoles },
  { id: "teams", label: "Teams", href: "/dashboard/teams", icon: "people", section: "team", roles: managerRoles },
  { id: "availability", label: "Availability", href: "/dashboard/availability", icon: "calendar", section: "team" },

  // What it cost, from the clock through to the payslip.
  { id: "time", label: "Time Tracking", href: "/dashboard/time", icon: "clock", section: "time" },
  { id: "timesheets", label: "Timesheets", href: "/dashboard/timesheets", icon: "calendar", section: "time", badge: "approvals" },
  { id: "finance", label: "Payroll & Accounting", href: "/dashboard/finance", icon: "chart", section: "time", roles: [...adminRoles, "hr", "finance"], badge: "divergences" },
  { id: "reports", label: "Reports", href: "/dashboard/reports", icon: "chart", section: "time", roles: managerRoles },

  // Readable by everyone, and deliberately so: the guide that matters most is
  // the worker's, and a help entry only admins can see helps the people who
  // need it least.
  { id: "help", label: "Help", href: "/dashboard/help", icon: "check", section: "company" },

  { id: "companies", label: "Companies & Partners", href: "/dashboard/companies", icon: "building", section: "company", roles: adminRoles },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: "gear", section: "company", roles: adminRoles },
];

/**
 * Removed rather than left greyed out: Expenses, STRATON Connect and
 * Marketplace were `disabled: true` and led nowhere. A menu that promises what
 * does not exist teaches people to stop reading it, and the three of them were
 * a sixth of the sidebar. They come back when their pages do.
 *
 * Also no longer listed, both still reachable and neither orphaned:
 *   Workforce  — the roles-and-skills overview, linked from People
 *   Roster     — permissions, linked from Settings → Permissions
 */

export const demoCompanies: AppCompanyOption[] = [{ id:"demo-belnex",name:"Belnex Energy (Demo)" },{ id:"demo-geotech",name:"GeoTech (Demo)" }];
export const demoAppUser: AppUserSummary = { name:"Gilberto Assunção",email:"Demonstration account",initials:"GA" };
