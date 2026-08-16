import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import EmployeeForm from "@/components/employees/EmployeeForm";
import { getTeamWorkspace } from "@/src/features/teams";
import PageHeader from "@/components/dashboard/PageHeader";

export const metadata: Metadata = { title: "Add employee" };

export default async function NewEmployeePage() {
  const [{ teams }, t] = await Promise.all([getTeamWorkspace(), getTranslations("employees")]);
  const teamNames = teams.map((team) => team.name);
  return <section aria-labelledby="new-employee-heading" className="mx-auto max-w-4xl"><Link href="/dashboard/employees" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">← {t("backToEmployeesLabel")}</Link><div className="mb-6 mt-3"><PageHeader headingId="new-employee-heading" title={t("addEmployee")} description={t("newEmployeeDescription")} /></div><EmployeeForm teams={teamNames} /></section>;
}
