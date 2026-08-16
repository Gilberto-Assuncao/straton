import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import TemplateForm from "@/components/operational-reports/TemplateForm";
import TemplateFieldEditor from "@/components/operational-reports/TemplateFieldEditor";
import { getManagedTemplateById } from "@/src/features/operational-reports/data";

export async function generateMetadata({ params }: { params: Promise<{ templateId: string }> }): Promise<Metadata> {
  const { templateId } = await params;
  const template = await getManagedTemplateById(templateId);
  return { title: template ? template.name : "Report template" };
}

export default async function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ field?: string }>;
}) {
  const [{ templateId }, { field }, t] = await Promise.all([params, searchParams, getTranslations("reportTemplates")]);
  const template = await getManagedTemplateById(templateId);
  if (!template) notFound();

  const editing = field ? template.fields.find((item) => item.id === field) : undefined;

  return (
    <section aria-labelledby="template-heading">
      <Link href="/dashboard/field-reports/templates" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-bright">← {t("backToTemplates")}</Link>
      <div className="mb-6 mt-3">
        <PageHeader headingId="template-heading" eyebrow={t("eyebrow")} title={template.name} description={t("editTemplateDescription")} />
      </div>
      <div className="grid gap-6">
        <TemplateForm template={{ id: template.id, name: template.name, segment: template.segment, description: template.description }} />
        <TemplateFieldEditor templateId={template.id} fields={template.fields} editing={editing} />
      </div>
    </section>
  );
}
