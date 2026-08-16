import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import EmployeeSummary from "@/components/employees/EmployeeSummary";
import EmployeeStatusButton from "@/components/employees/EmployeeStatusButton";
import { getEmployeeById } from "@/src/features/employees/data";
import PageHeader from "@/components/dashboard/PageHeader";

export async function generateMetadata({ params }: { params: Promise<{ employeeId: string }> }): Promise<Metadata> { const { employeeId } = await params; const employee = await getEmployeeById(employeeId); return { title: employee ? `${employee.firstName} ${employee.lastName}` : "Employee" }; }
export default async function EmployeeDetailsPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const [employee, t] = await Promise.all([getEmployeeById(employeeId), getTranslations("employees")]);
  if (!employee) notFound();
  return <section aria-labelledby="employee-heading"><Link href="/dashboard/employees" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">← {t("backToEmployeesLabel")}</Link><div className="mb-6 mt-3"><PageHeader headingId="employee-heading" eyebrow={t("employeeProfile")} title={`${employee.firstName} ${employee.lastName}`} actions={<><Link href={`/dashboard/employees/${employee.id}/edit`} className="flex min-h-11 items-center rounded-lg border border-edge-15 px-5 text-sm font-semibold text-ink hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-brand">{t("editEmployee")}</Link><EmployeeStatusButton employeeId={employee.id} status={employee.status} className="min-h-11 rounded-lg border border-red-400/30 px-5 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-red-300" /></>} /></div><EmployeeSummary employee={employee} /></section>;
}
