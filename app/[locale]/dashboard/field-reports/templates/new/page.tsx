import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import TemplateForm from "@/components/operational-reports/TemplateForm";

export const metadata: Metadata = { title: "New report template" };

export default async function NewTemplatePage() {
  const t = await getTranslations("reportTemplates");
  return (
    <section aria-labelledby="new-template-heading">
      <Link href="/dashboard/field-reports/templates" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">← {t("backToTemplates")}</Link>
      <div className="mb-6 mt-3"><PageHeader headingId="new-template-heading" eyebrow={t("eyebrow")} title={t("newTemplate")} description={t("newTemplateDescription")} /></div>
      <TemplateForm />
    </section>
  );
}
