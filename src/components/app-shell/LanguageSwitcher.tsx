"use client";
import { useTranslations } from "next-intl";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/src/i18n/navigation";

const languages = [
  { id: "en", label: "English" },
  { id: "pt", label: "Português" },
  { id: "fr", label: "Français" },
  { id: "nl", label: "Nederlands" },
  { id: "de", label: "Deutsch" },
  { id: "pl", label: "Polski" },
  { id: "ro", label: "Română" },
  { id: "es", label: "Español" },
  { id: "it", label: "Italiano" },
];

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
        className="min-h-11 rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-[#22C55E] disabled:opacity-60"
      >
        {languages.map((language) => (
          <option key={language.id} value={language.id}>{language.label}</option>
        ))}
      </select>
    </div>
  );
}
