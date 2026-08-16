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
    <div className="rounded-2xl border border-edge-10 bg-surface p-5">
      {feedback ? <p role="status" className="mb-4 text-sm text-ink-muted">{t(feedback)}</p> : null}
      <div className="flex flex-wrap gap-3">
        {isOwner && editable.includes(status) ? (
          <>
            <Link href={`/dashboard/field-reports/${reportId}/edit`} className="min-h-11 rounded-lg border border-edge-15 px-5 text-sm font-semibold text-ink hover:bg-edge-5 inline-flex items-center">{t("edit")}</Link>
            <button type="button" disabled={pending} onClick={() => run(() => submitOperationalReportAction(reportId))} className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-60">{t("submitApproval")}</button>
          </>
        ) : null}
        {isReviewer && reviewable.includes(status) ? (
          <>
            <button type="button" disabled={pending} onClick={() => run(() => approveOperationalReportAction(reportId))} className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover disabled:opacity-60">{t("approve")}</button>
            <button type="button" disabled={pending || !reason.trim()} onClick={() => run(() => requestChangesOperationalReportAction(reportId, reason))} className="min-h-11 rounded-lg border border-amber-400/30 px-5 text-sm font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-60">{t("requestChanges")}</button>
            <button type="button" disabled={pending || !reason.trim()} onClick={() => run(() => rejectOperationalReportAction(reportId, reason))} className="min-h-11 rounded-lg border border-red-400/30 px-5 text-sm font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-60">{t("reject")}</button>
          </>
        ) : null}
      </div>
      {isReviewer && reviewable.includes(status) ? (
        <div className="mt-4">
          <label htmlFor="review-reason" className="text-sm font-medium text-ink">{t("reasonLabel")}</label>
          <textarea id="review-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-edge-10 bg-surface-alt px-4 py-3 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20" />
        </div>
      ) : null}
    </div>
  );
}
