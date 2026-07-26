import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import SiteForm from "@/components/sites/SiteForm";
import { getProjectOptions } from "@/src/features/sites/data";

export const metadata: Metadata = { title: "New site" };

export default async function NewSitePage() {
  const [projects, t] = await Promise.all([getProjectOptions(), getTranslations("sites")]);
  return (
    <section aria-labelledby="new-site-heading">
      <Link href="/dashboard/sites" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]">← {t("backToSites")}</Link>
      <div className="mb-6 mt-3"><PageHeader headingId="new-site-heading" eyebrow={t("eyebrow")} title={t("newSite")} description={t("newSiteDescription")} /></div>
      <SiteForm projects={projects} />
    </section>
  );
}
