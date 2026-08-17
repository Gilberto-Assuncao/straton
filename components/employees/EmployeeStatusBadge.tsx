"use client";

import { useTranslations } from "next-intl";
import type { EmployeeStatus } from "@/lib/types/employee";

const styles: Record<EmployeeStatus, string> = { active: "bg-brand/10 text-brand-bright", invited: "bg-sky-400/10 text-info", inactive: "bg-edge-10 text-ink-muted" };
const labelKeys: Record<EmployeeStatus, string> = { active: "statusActive", invited: "statusInvited", inactive: "statusInactive" };
export default function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) { const t = useTranslations("employees"); return <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${styles[status]}`}>{t(labelKeys[status])}</span>; }
