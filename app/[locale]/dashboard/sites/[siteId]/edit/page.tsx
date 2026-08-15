import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import SiteForm from "@/components/sites/SiteForm";
import { getClientOptions, getSiteById } from "@/src/features/sites/data";

export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }): Promise<Metadata> {
  const { siteId } = await params;
  const site = await getSiteById(siteId);
  return { title: site ? `Edit ${site.name}` : "Edit site" };
}

export default async function EditSitePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const [site, clients, t] = await Promise.all([getSiteById(siteId),  getClientOptions(), getTranslations("sites")]);
  if (!site) notFound();
  return (
    <section aria-labelledby="edit-site-heading">
      <Link href="/dashboard/sites" className="inline-flex min-h-11 items-center text-sm font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]">← {t("backToSites")}</Link>
      <div className="mb-6 mt-3"><PageHeader headingId="edit-site-heading" eyebrow={t("eyebrow")} title={t("editSite")} description={site.name} /></div>
      <SiteForm site={site} clients={clients} />
    </section>
  );
}
