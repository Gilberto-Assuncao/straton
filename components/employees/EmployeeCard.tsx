"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import EmployeeStatusButton from "./EmployeeStatusButton";
import type { Employee } from "@/lib/types/employee";
import EmployeeStatusBadge from "./EmployeeStatusBadge";

export default function EmployeeCard({ employee }: { employee: Employee }) {
  const t = useTranslations("employees");
  const name = `${employee.firstName} ${employee.lastName}`;
  return <li className="rounded-2xl border border-white/10 bg-[#161A34] p-5"><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/10 text-sm font-bold text-[#22C55E]">{employee.avatarInitials}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold text-[#E5E7EB]">{name}</p><p className="truncate text-sm text-[#9CA3AF]">{employee.email}</p></div><EmployeeStatusBadge status={employee.status} /></div><dl className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-[#6B7280]">{t("jobTitleLabel")}</dt><dd className="mt-1 text-[#D1D5DB]">{employee.jobTitle}</dd></div><div><dt className="text-xs text-[#6B7280]">{t("teamLabel")}</dt><dd className="mt-1 text-[#D1D5DB]">{employee.team}</dd></div><div><dt className="text-xs text-[#6B7280]">{t("hoursThisWeek")}</dt><dd className="mt-1 text-[#D1D5DB]">{employee.totalHoursThisWeek}h</dd></div><div><dt className="text-xs text-[#6B7280]">{t("startDate")}</dt><dd className="mt-1 text-[#D1D5DB]">{employee.startDate}</dd></div></dl><div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4"><Link href={`/dashboard/employees/${employee.id}`} className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-[#22C55E] hover:bg-[#22C55E]/10 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("view")}</Link><Link href={`/dashboard/employees/${employee.id}/edit`} className="flex min-h-11 items-center justify-center rounded-lg text-sm font-semibold text-[#D1D5DB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("edit")}</Link><EmployeeStatusButton employeeId={employee.id} status={employee.status} className="min-h-11 rounded-lg text-sm font-semibold text-red-300 hover:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-red-300 disabled:opacity-50" /></div></li>;
}
