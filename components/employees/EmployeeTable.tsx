"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import EmployeeStatusButton from "./EmployeeStatusButton";
import type { Employee } from "@/lib/types/employee";
import EmployeeCard from "./EmployeeCard";
import EmployeeFilters, { type StatusFilter } from "./EmployeeFilters";
import EmployeeStatusBadge from "./EmployeeStatusBadge";
import EmptyEmployeesState from "./EmptyEmployeesState";

export default function EmployeeTable({ employees, teams }: { employees: Employee[]; teams: string[] }) {
  const t = useTranslations("employees");
  const [search, setSearch] = useState(""); const [status, setStatus] = useState<StatusFilter>("all"); const [team, setTeam] = useState("all");
  const filtered = useMemo(() => employees.filter((employee) => { const query = search.trim().toLowerCase(); const matchesSearch = !query || `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(query) || employee.email.toLowerCase().includes(query); return matchesSearch && (status === "all" || employee.status === status) && (team === "all" || employee.team === team); }), [employees, search, status, team]);
  const hasFilters = search.length > 0 || status !== "all" || team !== "all";
  function clear() { setSearch(""); setStatus("all"); setTeam("all"); }
  const columns = [t("columnEmployee"), t("jobTitleLabel"), t("teamLabel"), t("status"), t("hoursThisWeek"), t("startDate"), t("columnActions")];
  return <div className="mt-6"><EmployeeFilters search={search} status={status} team={team} teams={teams} onSearch={setSearch} onStatus={setStatus} onTeam={setTeam} onClear={clear} hasFilters={hasFilters} /><p className="mt-4 text-sm text-[#9CA3AF]" aria-live="polite">{t("showingCount", { shown: filtered.length, total: employees.length })}</p>{filtered.length === 0 ? <div className="mt-4"><EmptyEmployeesState filtered={hasFilters} /></div> : <><div className="mt-4 hidden overflow-hidden rounded-2xl border border-white/10 bg-[#161A34] lg:block"><table className="w-full border-collapse text-left text-sm"><thead className="border-b border-white/10 bg-[#111827]/60 text-xs uppercase tracking-wide text-[#9CA3AF]"><tr>{columns.map((heading) => <th key={heading} scope="col" className="px-5 py-4 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-white/10">{filtered.map((employee) => <tr key={employee.id} className="hover:bg-white/[0.03]"><th scope="row" className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#22C55E]/10 text-xs font-bold text-[#22C55E]">{employee.avatarInitials}</span><div><p className="font-semibold text-[#E5E7EB]">{employee.firstName} {employee.lastName}</p><p className="text-xs font-normal text-[#9CA3AF]">{employee.email}</p></div></div></th><td className="px-5 py-4 text-[#D1D5DB]">{employee.jobTitle}</td><td className="px-5 py-4 text-[#D1D5DB]">{employee.team ?? t("noTeam")}</td><td className="px-5 py-4"><EmployeeStatusBadge status={employee.status} /></td><td className="px-5 py-4 text-[#D1D5DB]">{employee.totalHoursThisWeek}h</td><td className="px-5 py-4 text-[#9CA3AF]">{employee.startDate}</td><td className="px-5 py-4"><div className="flex gap-1"><Link href={`/dashboard/employees/${employee.id}`} className="flex min-h-11 items-center px-2 font-semibold text-[#22C55E] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("view")}</Link><Link href={`/dashboard/employees/${employee.id}/edit`} className="flex min-h-11 items-center px-2 font-semibold text-[#D1D5DB] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("edit")}</Link><EmployeeStatusButton employeeId={employee.id} status={employee.status} /></div></td></tr>)}</tbody></table></div><ul className="mt-4 grid gap-4 lg:hidden">{filtered.map((employee) => <EmployeeCard key={employee.id} employee={employee} />)}</ul></> }</div>;
}
