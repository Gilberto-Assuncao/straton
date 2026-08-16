"use client";
import { useTranslations } from "next-intl";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { locales, localeLabels } from "@/src/i18n/routing";

const languages = locales.map((id) => ({ id, label: localeLabels[id] }));

export function LanguageSwitcher() {
  const tShell = useTranslations("appShell");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(nextLocale: string) {
    startTransition(() => router.replace(pathname, { locale: nextLocale }));
  }

  return (
    <div>
      <label htmlFor="language-switcher" className="sr-only">{tShell("language")}</label>
      <select
        id="language-switcher"
        value={locale}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-white/10 bg-surface-alt px-3 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
      >
        {languages.map((language) => (
          <option key={language.id} value={language.id}>{language.label}</option>
        ))}
      </select>
    </div>
  );
}
