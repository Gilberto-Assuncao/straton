import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import CompanyNetwork from "@/components/companies/CompanyNetwork";
import { getCompanyNetwork } from "@/src/features/partners/network";

export const metadata: Metadata = { title: "Network" };

export default async function CompanyNetworkPage() {
  const [network, t] = await Promise.all([getCompanyNetwork(), getTranslations("network")]);

  return (
    <section aria-labelledby="network-heading">
      <Link
        href="/dashboard/companies"
        className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-bright"
      >
        ← {t("backToCompanies")}
      </Link>
      <div className="mt-3">
        <PageHeader headingId="network-heading" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      </div>
      <div className="mt-8">
        <CompanyNetwork network={network} />
      </div>
    </section>
  );
}
