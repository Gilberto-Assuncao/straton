import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CompaniesList, listCompanies } from "@/src/features/companies";
import PartnersPanel from "@/components/companies/PartnersPanel";
import InviteNewCompany from "@/components/companies/InviteNewCompany";
import { getCompanyPartners } from "@/src/features/partners/data";
import { getCompanyInvites } from "@/src/features/partners/invites";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const [companies, partners, invites, t] = await Promise.all([
    listCompanies(),
    getCompanyPartners(),
    getCompanyInvites(),
    getTranslations("companies"),
  ]);

  const button = "inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold";

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand">{t("eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t("description")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/companies/network" className={`${button} border border-edge-15 text-ink hover:bg-edge-5`}>
            {t("network")}
          </Link>
          <Link href="/dashboard/companies/new" className={`${button} bg-brand text-on-brand`}>
            {t("createCompany")}
          </Link>
        </div>
      </header>

      <CompaniesList companies={companies} />

      {/* Two different problems, side by side: linking a company already here,
          and bringing in one that has never heard of STRATON. The second is the
          common case for a Belgian subcontractor.

          PartnersPanel is still untranslated — the rest of #28. */}
      <PartnersPanel relationships={partners} />
      <InviteNewCompany invites={invites} />
    </div>
  );
}
