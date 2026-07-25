import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import PayrollSummary from "@/components/payroll/PayrollSummary";
import { getPayrollPeriodSummary } from "@/src/features/payroll/data";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const [summary, t] = await Promise.all([getPayrollPeriodSummary(), getTranslations("payroll")]);
  return (
    <section aria-labelledby="payroll-heading">
      <PageHeader headingId="payroll-heading" eyebrow={t("eyebrow")} title={t("title", { period: summary.periodLabel })} description={t("description")} />
      <PayrollSummary summary={summary} />
    </section>
  );
}
