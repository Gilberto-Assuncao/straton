"use client";

import { useTranslations } from "next-intl";
import type { ApprovalStatus } from "@/lib/types/timesheet";

const statusConfig: Record<ApprovalStatus, { key: string; icon: string; style: string }> = { draft: { key: "statusDraft", icon: "○", style: "bg-white/8 text-ink-soft" }, submitted: { key: "statusSubmitted", icon: "↑", style: "bg-blue-400/10 text-blue-300" }, approved: { key: "statusApproved", icon: "✓", style: "bg-brand/10 text-brand-bright" }, rejected: { key: "statusRejected", icon: "!", style: "bg-red-400/10 text-red-300" } };
export default function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) { const t = useTranslations("timesheets"); const config = statusConfig[status]; return <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${config.style}`}><span aria-hidden="true">{config.icon}</span>{t(config.key)}</span>; }
