import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import EmployeeTable from "@/components/employees/EmployeeTable";
import { getEmployees } from "@/src/features/employees/data";
import PageHeader from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const [{ employees, teamNames }, t] = await Promise.all([getEmployees(), getTranslations("employees")]);
  const active = employees.filter((employee) => employee.status === "active").length;
  const invited = employees.filter((employee) => employee.status === "invited").length;
  const statCards = [
    { label: t("statActiveTeams"), value: teamNames.length, color: "text-brand-bright", border: "border-white/10" },
    { label: t("statTotalEmployees"), value: employees.length, color: "text-ink", border: "border-white/10" },
    { label: t("statActive"), value: active, color: "text-brand-bright", border: "border-white/10" },
    { label: t("statPendingInvites"), value: invited, color: "text-warning", border: invited > 0 ? "border-amber-400/30" : "border-white/10" },
  ];
  return <section aria-labelledby="employees-heading">
    <PageHeader headingId="employees-heading" eyebrow={t("eyebrow")} title={t("title")} description={t("employeeCountDescription", { count: employees.length })} actions={<div className="flex flex-wrap gap-3">
      {/* The roles-and-skills overview left the sidebar in #36. This is the way
          in now — a page nobody can navigate to is a page that stops existing. */}
      <Link href="/dashboard/workforce" className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-ink hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-brand">{t("workforceOverviewLink")}</Link>
      <Link href="/dashboard/employees/new" className="flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{t("addEmployee")}</Link>
    </div>} />
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {statCards.map((card) => (
        <div key={card.label} className={`rounded-2xl border ${card.border} bg-surface p-4.5`}>
          <p className="text-xs text-ink-muted">{card.label}</p>
          <p className={`mt-2 font-mono text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
    <div className="mt-6"><EmployeeTable employees={employees} teams={teamNames} /></div>
  </section>;
}
