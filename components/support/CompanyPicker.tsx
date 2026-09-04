"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { startSupportSessionAction } from "@/src/features/support/actions";
import type { SupportCompany } from "@/src/features/support/data";

/**
 * Choosing whose data to look at (#19).
 *
 * A deliberate act with a named subject, not a toggle. The search is here
 * because a platform with more than a handful of customers turns "pick the
 * right one" into the place a mistake happens.
 */
export default function CompanyPicker({ companies }: { companies: SupportCompany[] }) {
  const t = useTranslations("support");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? companies.filter((company) =>
        `${company.name} ${company.vat ?? ""} ${company.city ?? ""}`.toLowerCase().includes(needle),
      )
    : companies;

  function start(company: SupportCompany) {
    setMessage(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("companyId", company.id);
      const result = await startSupportSessionAction(form);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.push(`/dashboard/support/${company.id}`);
    });
  }

  return (
    <div>
      <label className="grid gap-1">
        <span className="text-sm font-medium text-ink">{t("searchLabel")}</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 w-full rounded-lg border border-edge-15 bg-canvas px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-brand"
        />
      </label>

      <ul className="mt-5 grid gap-2">
        {shown.map((company) => (
          <li key={company.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(company)}
              className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-edge-10 bg-surface px-4 text-left transition hover:border-brand/40 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{company.name}</span>
                <span className="mt-0.5 block truncate text-xs text-ink-subtle">
                  {[company.vat, company.city].filter(Boolean).join(" · ") || t("noDetails")}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand-bright">{t("openSession")} →</span>
            </button>
          </li>
        ))}
        {shown.length === 0 ? <li className="text-sm text-ink-muted">{t("noMatches")}</li> : null}
      </ul>

      {message ? (
        <p role="status" className="mt-4 text-sm text-danger-soft">
          {t(message)}
        </p>
      ) : null}
    </div>
  );
}
