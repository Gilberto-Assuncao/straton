"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReportMessageKey } from "@/src/features/operational-reports/messages";
import {
  approveOperationalReportAction,
  rejectOperationalReportAction,
  requestChangesOperationalReportAction,
  submitOperationalReportAction,
} from "@/src/features/operational-reports/actions";
import type { OperationalReportStatus } from "@/lib/types/operational-reports";

type Props = { reportId: string; status: OperationalReportStatus; isOwner: boolean; isReviewer: boolean };

const editable = ["draft", "changes_requested"];
const reviewable = ["submitted", "under_review"];

export default function ReportActions({ reportId, status, isOwner, isReviewer }: Props) {
  const t = useTranslations("operationalReports");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<ReportMessageKey | null>(null);

  function run(action: () => Promise<{ ok: boolean; messageKey: ReportMessageKey }>) {
    startTransition(async () => {
      const result = await action();
      setFeedback(result.messageKey);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5">
      {feedback ? <p role="status" className="mb-4 text-sm text-[#9CA3AF]">{t(feedback)}</p> : null}
      <div className="flex flex-wrap gap-3">
        {isOwner && editable.includes(status) ? (
          <>
            <Link href={`/dashboard/field-reports/${reportId}/edit`} className="min-h-11 rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 inline-flex items-center">{t("edit")}</Link>
            <button type="button" disabled={pending} onClick={() => run(() => submitOperationalReportAction(reportId))} className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] disabled:opacity-60">{t("submitApproval")}</button>
          </>
        ) : null}
        {isReviewer && reviewable.includes(status) ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => approveOperationalReportAction(reportId))} className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] disabled:opacity-60">{t("approve")}</button>
            <button type="button" disabled={pending || !reason.trim()} onClick={() => run(() => requestChangesOperationalReportAction(reportId, reason))} className="min-h-11 rounded-lg border border-amber-400/30 px-5 text-sm font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-60">{t("requestChanges")}</button>
            <button type="button" disabled={pending || !reason.trim()} onClick={() => run(() => rejectOperationalReportAction(reportId, reason))} className="min-h-11 rounded-lg border border-red-400/30 px-5 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-60">{t("reject")}</button>
          </>
        ) : null}
      </div>
      {isReviewer && reviewable.includes(status) ? (
        <div className="mt-4">
          <label htmlFor="review-reason" className="text-sm font-medium text-[#E5E7EB]">{t("reasonLabel")}</label>
          <textarea id="review-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-[#111827] px-4 py-3 text-base text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20" />
        </div>
      ) : null}
    </div>
  );
}
