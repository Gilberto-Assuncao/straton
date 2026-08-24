import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import { requireActiveCompany } from "@/src/application/session/server";
import { guideOrderFor, resolveHelpGuide } from "@/src/content/help";

export const metadata: Metadata = { title: "Help" };

export default async function HelpIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale }, { session }, t] = await Promise.all([
    params,
    requireActiveCompany(),
    getTranslations("help"),
  ]);

  // The reader's own guide first. Not a filter: a supervisor who wants to know
  // what their crew sees should be able to read the worker's guide.
  const order = guideOrderFor(session.activeCompany?.roles ?? []);

  return (
    <section aria-labelledby="help-heading">
      <PageHeader headingId="help-heading" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {order.map((id) => {
          const { guide } = resolveHelpGuide(id, locale);
          return (
            <Link
              key={id}
              href={`/dashboard/help/${id}`}
              className="rounded-2xl border border-edge-10 bg-surface p-5 transition hover:border-brand/40 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <h2 className="text-base font-semibold text-ink">{guide.title}</h2>
              <p className="mt-1.5 text-sm text-ink-dim">{guide.audience}</p>
              <p className="mt-3 text-sm font-semibold text-brand-bright">{t("open")} →</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
