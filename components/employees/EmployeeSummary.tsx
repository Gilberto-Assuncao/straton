"use client";

import { useTranslations } from "next-intl";
import type { Employee } from "@/lib/types/employee";
import EmployeeStatusBadge from "./EmployeeStatusBadge";

export default function EmployeeSummary({ employee }: { employee: Employee }) {
  const t = useTranslations("employees");
  const fields = [
    { label: t("emailLabel"), value: employee.email },
    { label: t("phone"), value: employee.phone ?? t("notProvided") },
    { label: t("employmentType"), value: employee.employmentType },
    { label: t("startDate"), value: employee.startDate },
    { label: t("hoursThisWeek"), value: `${employee.totalHoursThisWeek}h` },
    { label: t("hourlyRate"), value: employee.hourlyRate ? `€${employee.hourlyRate.toFixed(2)}` : t("notSet") },
  ];
  return <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]"><section className="rounded-2xl border border-edge-10 bg-surface p-6 text-center"><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand/10 text-2xl font-bold text-brand">{employee.avatarInitials}</span><h3 className="mt-4 text-xl font-bold text-ink">{employee.firstName} {employee.lastName}</h3><p className="mt-1 text-sm text-ink-muted">{employee.jobTitle}</p><p className="mt-1 text-sm text-ink-muted">{employee.team ?? t("noTeam")}</p><div className="mt-4"><EmployeeStatusBadge status={employee.status} /></div></section><section aria-labelledby="employee-details-title" className="rounded-2xl border border-edge-10 bg-surface p-6"><h3 id="employee-details-title" className="font-semibold text-ink">{t("employeeDetailsTitle")}</h3><dl className="mt-5 grid gap-5 sm:grid-cols-2">{fields.map((field) => <div key={field.label}><dt className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{field.label}</dt><dd className="mt-2 break-words text-sm capitalize text-ink-soft">{field.value}</dd></div>)}</dl></section></div>;
}
