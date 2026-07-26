import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/dashboard/PageHeader";
import ReportsList from "@/components/operational-reports/ReportsList";
import { getOperationalReports } from "@/src/features/operational-reports/data";

export const metadata: Metadata = { title: "Field Reports" };

export default async function FieldReportsPage() {
  const { reports, canReviewAll } = await getOperationalReports();
  return (
    <section aria-labelledby="field-reports-heading">
      <PageHeader
        headingId="field-reports-heading"
        eyebrow="Operations"
        title="Field Reports"
        description={canReviewAll ? "Operational reports submitted by your teams." : "Your submitted operational reports."}
        actions={<><Link href="/dashboard/field-reports/templates" className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5">Templates</Link><Link href="/dashboard/field-reports/new" className="inline-flex min-h-11 items-center rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A]">New report</Link></>}
      />
      <div className="mt-8"><ReportsList reports={reports} /></div>
    </section>
  );
}
