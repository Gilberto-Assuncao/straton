"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { switchCompanyAction } from "@/app/[locale]/auth/actions";
import type { AppCompanyOption } from "./types";
import type { AuthMessageKey } from "@/app/[locale]/auth/state";

export function CompanySwitcher({ companies, value }: { companies: AppCompanyOption[]; value?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("auth");
  const tShell = useTranslations("appShell");
  const [error, setError] = useState<AuthMessageKey | null>(null);

  function changeCompany(companyId: string) {
    setError(null);
    startTransition(async () => {
      const result = await switchCompanyAction(companyId);
      if (!result.ok) {
        setError(result.messageKey ?? "errNoCompanyAccess");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <label htmlFor="company-switcher" className="sr-only">{tShell("currentCompany")}</label>
      <select id="company-switcher" value={value ?? ""} disabled={pending || companies.length === 0} onChange={(event) => changeCompany(event.target.value)} aria-describedby={error ? "company-switcher-error" : undefined} className="min-h-11 w-full max-w-32 rounded-lg border border-edge-10 bg-surface-alt px-2 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60 sm:max-w-44 sm:px-3 sm:text-sm">
        {companies.length === 0 ? <option value="">{tShell("noCompany")}</option> : null}
        {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
      </select>
      {error ? <span id="company-switcher-error" role="alert" className="absolute right-0 top-12 w-64 rounded-lg border border-red-400/30 bg-surface p-2 text-xs text-red-200 shadow-xl">{t(error)}</span> : null}
    </div>
  );
}
