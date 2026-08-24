import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import type { HelpResolution } from "@/src/content/help";

/**
 * One guide, rendered to be read on a phone (#46).
 *
 * Narrow measure and generous line height because the audience that matters
 * most reads this standing up, outdoors, one-handed. Nothing here is
 * interactive: a manual that needs to be operated is a second thing to learn.
 */
export default async function HelpGuideView({ resolution }: { resolution: HelpResolution }) {
  const t = await getTranslations("help");
  const { guide, language, isFallback } = resolution;

  return (
    <article className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/help"
        className="text-sm font-semibold text-brand-bright hover:text-brand focus-visible:outline-2 focus-visible:outline-brand"
      >
        ← {t("backToGuides")}
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-ink-bright sm:text-3xl">{guide.title}</h1>
      <p className="mt-2 text-sm text-ink-dim">{guide.audience}</p>

      {/*
        Said in the reader's own language, about a guide that is not in it.
        Which fallback they got matters: a Brazilian reader sent to European
        Portuguese understands every word, and telling them "this is English"
        would be both wrong and alarming.
      */}
      {isFallback ? (
        <p className="mt-5 rounded-lg border border-edge-15 bg-surface-inset px-4 py-3 text-sm text-warning">
          {language === "pt" ? t("fallbackToPortuguese") : t("fallbackToEnglish")}
        </p>
      ) : null}

      <div className="mt-8 space-y-8">
        {guide.sections.map((section) => (
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
    </article>
  );
}
