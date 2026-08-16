"use client";

import { useTranslations } from "next-intl";
import { retentionCheckUrl } from "@/src/features/companies/retention-check";

/**
 * Opens the official retention-obligation portal with the enterprise number
 * already filled in. Deliberately a plain link, not a fetch: the portal is
 * CAPTCHA-protected and the check must stay inside the government's own flow.
 */
export default function RetentionCheckLink({
  enterpriseNumber,
  className,
}: {
  enterpriseNumber: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations("retention");
  const url = retentionCheckUrl(enterpriseNumber);

  if (!url) {
    return (
      <p className="text-xs leading-5 text-ink-subtle">{t("needsEnterpriseNumber")}</p>
    );
  }

  return (
    <div className="grid gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className ?? "inline-flex min-h-11 w-fit items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-amber-300"}
      >
        {t("checkAction")}
        <span aria-hidden="true">↗</span>
      </a>
      <p className="text-xs leading-5 text-ink-muted">{t("checkHelp")}</p>
    </div>
  );
}
