import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import ReportActions from "@/components/operational-reports/ReportActions";
import { getOperationalReportDetail, reviewerRoles } from "@/src/features/operational-reports/data";
import { requireActiveCompany } from "@/src/application/session/server";

export const metadata: Metadata = { title: "Field Report" };

export default async function FieldReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ session }, report] = await Promise.all([requireActiveCompany(), getOperationalReportDetail(id)]);
  if (!report) notFound();

  const isOwner = report.workerId === session.user.id;
  const isReviewer = session.activeCompany!.roles.some((role) => reviewerRoles.includes(role));

  return (
    <section aria-labelledby="field-report-heading" className="mx-auto max-w-4xl">
      <Link href="/dashboard/field-reports" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#9CA3AF] hover:text-[#E5E7EB]">← Back to field reports</Link>
      <div className="mb-6 mt-3">
        <PageHeader headingId="field-report-heading" eyebrow={report.templateName ?? "Generic report"} title={`${report.workerName} · ${report.reportDate}`} description={report.activity ?? undefined} />
      </div>

      <div className="grid gap-6">
        <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
          <dl className="grid gap-5 sm:grid-cols-2">
            <div><dt className="text-sm text-[#9CA3AF]">Status</dt><dd className="mt-1 font-semibold text-[#E5E7EB]">{report.status.replace("_", " ")}</dd></div>
            <div><dt className="text-sm text-[#9CA3AF]">Project</dt><dd className="mt-1 font-semibold text-[#E5E7EB]">{report.siteName ?? "—"}</dd></div>
            <div><dt className="text-sm text-[#9CA3AF]">Work site</dt><dd className="mt-1 font-semibold text-[#E5E7EB]">{report.siteName ?? "—"}</dd></div>
            <div><dt className="text-sm text-[#9CA3AF]">Break</dt><dd className="mt-1 font-semibold text-[#E5E7EB]">{report.breakMinutes} min</dd></div>
            <div><dt className="text-sm text-[#9CA3AF]">Start</dt><dd className="mt-1 font-semibold text-[#E5E7EB]">{report.startsAt ?? "—"}</dd></div>
            <div><dt className="text-sm text-[#9CA3AF]">End</dt><dd className="mt-1 font-semibold text-[#E5E7EB]">{report.endsAt ?? "—"}</dd></div>
          </dl>
          {report.notes ? <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-[#9CA3AF]">{report.notes}</p> : null}
          {report.rejectionReason ? <p className="mt-5 rounded-lg bg-amber-400/10 p-4 text-sm leading-6 text-amber-300">{report.rejectionReason}</p> : null}
        </div>

        {report.templateFields.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">{report.templateName} fields</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {report.templateFields.map((templateField) => {
                const value = report.values[templateField.key];
                const display = Array.isArray(value) ? value.join(", ") : typeof value === "boolean" ? (value ? "Yes" : "No") : (value ?? "—");
                return (
                  <div key={templateField.id}>
                    <dt className="text-sm text-[#9CA3AF]">{templateField.label}</dt>
                    <dd className="mt-1 font-medium text-[#E5E7EB]">{String(display)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ) : null}

        <ReportActions reportId={report.id} status={report.status} isOwner={isOwner} isReviewer={isReviewer} />

        {report.history.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">History</p>
            <ul className="mt-4 space-y-3 text-sm">
              {report.history.map((entry) => (
                <li key={entry.id} className="border-l-2 border-white/10 pl-4">
                  <p className="font-medium text-[#E5E7EB]">{entry.action.replace("_", " ")}{entry.actorName ? ` — ${entry.actorName}` : ""}</p>
                  <p className="text-xs text-[#6B7280]">{new Date(entry.occurredAt).toLocaleString()}</p>
                  {entry.note ? <p className="mt-1 text-[#9CA3AF]">{entry.note}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
