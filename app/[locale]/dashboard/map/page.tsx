import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import LiveOperationsMap from "@/components/operations/LiveOperationsMap";
import { getLivePresence } from "@/src/features/operations/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("liveMap");
  return { title: t("metadataTitle") };
}

export default async function LiveMapPage() {
  const [t, sites] = await Promise.all([getTranslations("liveMap"), getLivePresence()]);
  return <section aria-labelledby="live-map-heading">
    <PageHeader headingId="live-map-heading" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
    <div className="mt-8"><LiveOperationsMap sites={sites} /></div>
  </section>;
}
