import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardCard } from "@/src/components/dashboard";
import { CompanyDetailsForm } from "@/src/features/companies";
export const metadata: Metadata={title:"Create company"};
export default async function NewCompanyPage(){const t=await getTranslations("companies");return <div className="mx-auto max-w-5xl space-y-6"><header><p className="text-sm font-semibold text-brand">{t("companyManagement")}</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t("createCompany")}</h1><p className="mt-2 text-sm text-ink-muted">{t("createCompanyHelp")}</p></header><DashboardCard title={t("companyProfile")} description={t("companyProfileHelp")}><CompanyDetailsForm/></DashboardCard></div>;}
