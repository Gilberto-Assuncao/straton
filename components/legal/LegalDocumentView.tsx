import { Link } from "@/src/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LEGAL, type LegalResolution } from "@/src/content/legal";

/**
 * A legal document, rendered as a document.
 *
 * Tokens rather than the landing page's hand-written palette, which is the one
 * deliberate difference in look. The landing is a dark poster; this is
 * something a works council or a lawyer may print, and it has to be readable in
 * whichever theme the reader's phone or browser is set to.
 */
export default async function LegalDocumentView({ resolution }: { resolution: LegalResolution }) {
  const t = await getTranslations("legal");
  const { document, isFallback } = resolution;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:px-8">
      <Link
        href="/"
        className="text-sm font-semibold text-brand-bright hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        ← {t("backHome")}
      </Link>

      <h1 className="mt-8 text-3xl font-bold text-ink-bright sm:text-4xl">{document.title}</h1>
      <p className="mt-3 text-base text-ink-dim">{document.summary}</p>
      <p className="mt-2 text-sm text-ink-subtle">{t("updatedOn", { date: LEGAL.updatedAt })}</p>

      {/*
        Said in the reader's language, about a document that is not. Leaving it
        out would be the worse of the two failures: English text with no
        explanation reads as a broken page, and the reader has no way to know
        whether a version they can read exists.
      */}
      {isFallback ? (
        <p className="mt-6 rounded-lg border border-edge-15 bg-surface-inset px-4 py-3 text-sm text-warning">
          {t("fallbackNotice")}
        </p>
      ) : null}

      <div className="mt-10 space-y-9">
        {document.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold text-ink">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 text-[15px] leading-[1.7] text-ink-dim">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-14 border-t border-edge-10 pt-6 text-sm text-ink-subtle">
        {LEGAL.operator} · <a href={`mailto:${LEGAL.contactEmail}`} className="underline underline-offset-2 hover:text-ink">{LEGAL.contactEmail}</a>
      </p>
    </main>
  );
}
