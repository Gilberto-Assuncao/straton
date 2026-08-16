import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import EmployeeEditForm from "@/components/employees/EmployeeEditForm";
import PageHeader from "@/components/dashboard/PageHeader";
import { getEmployeeById, getEmployees } from "@/src/features/employees/data";

export async function generateMetadata({ params }: { params: Promise<{ employeeId: string }> }): Promise<Metadata> {
  const { employeeId } = await params;
  const employee = await getEmployeeById(employeeId);
  return { title: employee ? `Edit ${employee.firstName} ${employee.lastName}` : "Edit employee" };
}

export default async function EditEmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const [employee, { teamNames }, t] = await Promise.all([
    getEmployeeById(employeeId),
    getEmployees(),
    getTranslations("employees"),
  ]);
  if (!employee) notFound();

  return (
    <section aria-labelledby="edit-employee-heading">
      <Link href={`/dashboard/employees/${employee.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">← {t("backToProfile")}</Link>
      <div className="mb-6 mt-3">
        <PageHeader headingId="edit-employee-heading" eyebrow={t("employeeProfile")} title={t("editEmployee")} description={`${employee.firstName} ${employee.lastName}`} />
      </div>
      <EmployeeEditForm employee={employee} teams={teamNames} />
    </section>
  );
}
