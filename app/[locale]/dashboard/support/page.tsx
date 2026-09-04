import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import CompanyPicker from "@/components/support/CompanyPicker";
import { getSupportCompanies, isPlatformAdmin } from "@/src/features/support/data";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  // 404 and not a "you do not have permission" screen. To somebody who is not a
  // platform admin, this route does not exist — telling them it does, and that
  // they are not allowed in, is telling them where to knock.
  if (!(await isPlatformAdmin())) notFound();

  const [companies, t] = await Promise.all([getSupportCompanies(), getTranslations("support")]);

  return (
    <section aria-labelledby="support-heading">
      <PageHeader headingId="support-heading" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="mt-8 max-w-2xl">
        <CompanyPicker companies={companies} />
      </div>
    </section>
  );
}
