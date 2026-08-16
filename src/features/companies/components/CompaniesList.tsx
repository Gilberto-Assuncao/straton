"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CompanyCard } from "@/src/components/cards";
import { CompanyStatusBadge } from "./CompanyStatusBadge";
import type { CompanySummary } from "../types";

export function CompaniesList({ companies }: { companies: CompanySummary[] }) {
  const t = useTranslations("companies");

  if (!companies.length) {
    return (
      <section className="rounded-2xl border border-dashed border-edge-15 bg-surface p-8 text-center">
        <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-2 text-sm text-ink-muted">{t("emptyBody")}</p>
        <Link
          href="/dashboard/companies/new"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 font-semibold text-on-brand"
        >
          {t("createCompany")}
        </Link>
      </section>
    );
  }

  return (
    <section aria-label={t("yourCompanies")} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {companies.map((company) => (
        <CompanyCard
          key={company.id}
          title={company.displayName}
          // Roles come from the database as English identifiers. They share the
          // translation table already built for the workforce badges rather
          // than getting a second, divergent copy.
          subtitle={company.roles.join(", ") || t("member")}
          status={company.status}
          metadata={
            <div className="flex items-center justify-between gap-3">
              <span>{company.countryCode ?? t("authorized")}</span>
              <CompanyStatusBadge status={company.status} />
            </div>
          }
          action={
            <Link href={`/dashboard/companies/${company.id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-bright">
              {t("viewCompany")}
            </Link>
          }
        />
      ))}
    </section>
  );
}
