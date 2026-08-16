"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import EmployeeStatusButton from "./EmployeeStatusButton";
import type { Employee } from "@/lib/types/employee";
import EmployeeStatusBadge from "./EmployeeStatusBadge";

export default function EmployeeCard({ employee }: { employee: Employee }) {
  const t = useTranslations("employees");
  const name = `${employee.firstName} ${employee.lastName}`;
  return <li className="rounded-2xl border border-edge-10 bg-surface p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand-bright">{employee.avatarInitials}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink">{name}</p><p className="truncate text-sm text-ink-muted">{employee.email}</p></div><EmployeeStatusBadge status={employee.status} /></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-ink-subtle">{t("jobTitleLabel")}</dt><dd className="mt-1 text-ink-soft">{employee.jobTitle}</dd></div><div><dt className="text-xs text-ink-subtle">{t("teamLabel")}</dt><dd className="mt-1 text-ink-soft">{employee.team ?? t("noTeam")}</dd></div><div><dt className="text-xs text-ink-subtle">{t("hoursThisWeek")}</dt><dd className="mt-1 text-ink-soft">{employee.totalHoursThisWeek}h</dd></div><div><dt className="text-xs text-ink-subtle">{t("startDate")}</dt><dd className="mt-1 text-ink-soft">{employee.startDate}</dd></div></dl><div className="mt-5 grid grid-cols-3 gap-2 border-t border-edge-10 pt-4"><Link href={`/dashboard/employees/${employee.id}`} className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-brand-bright hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand-bright">{t("view")}</Link><Link href={`/dashboard/employees/${employee.id}/edit`} className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-ink-soft hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-brand-bright">{t("edit")}</Link><EmployeeStatusButton employeeId={employee.id} status={employee.status} className="min-h-11 rounded-lg text-sm font-semibold text-red-300 hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-red-300 disabled:opacity-50" /></div></li>;
}
