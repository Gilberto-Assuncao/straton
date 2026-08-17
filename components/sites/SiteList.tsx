"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SiteMessageKey } from "@/src/features/sites/messages";
import { archiveSiteAction } from "@/src/features/sites/actions";
import type { SiteRecord } from "@/src/features/sites/types";

const tone: Record<string, string> = {
  active: "bg-brand/10 text-brand-bright",
  paused: "bg-amber-400/10 text-warning-soft",
  completed: "bg-sky-400/10 text-info",
  archived: "bg-edge-10 text-ink-muted",
};

export default function SiteList({ sites }: { sites: SiteRecord[] }) {
  const t = useTranslations("sites");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<SiteMessageKey | null>(null);

  function toggleArchive(site: SiteRecord) {
    const archiving = site.status !== "archived";
    if (archiving && !window.confirm(t("archiveConfirm"))) return;
    setError(null);
    startTransition(async () => {
      const result = await archiveSiteAction(site.id, archiving);
      if (!result.ok) setError(result.messageKey);
      else router.refresh();
    });
  }

  if (sites.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge-15 bg-surface px-6 py-16 text-center">
        <p className="text-sm font-medium text-ink-muted">{t("empty")}</p>
        <Link href="/dashboard/sites/new" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover">{t("newSite")}</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? <p role="alert" className="rounded-lg bg-red-400/10 p-4 text-sm text-danger-soft">{t(error)}</p> : null}
      {sites.map((site) => {
        const parts = [site.address.street, site.address.postal_code, site.address.city].filter(Boolean);
        return (
          <article key={site.id} className="rounded-2xl border border-edge-10 bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-semibold"><Link href={`/dashboard/sites/${site.id}`} className="text-ink hover:text-brand-bright focus-visible:outline-2 focus-visible:outline-brand">{site.name}</Link></h3>
                  <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${tone[site.status] ?? tone.active}`}>{t(`status_${site.status}` as "status_active")}</span>
                  {site.reference ? <span className="text-xs text-ink-subtle">{site.reference}</span> : null}
                </div>
                <p className="mt-1.5 text-sm text-ink-muted">{parts.length ? parts.join(", ") : t("noAddress")}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Link href={`/dashboard/sites/${site.id}`} className="flex min-h-11 items-center px-3 text-sm font-semibold text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-brand">{t("open")}</Link><Link href={`/dashboard/sites/${site.id}/edit`} className="flex min-h-11 items-center px-3 text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">{t("edit")}</Link>
                <button type="button" onClick={() => toggleArchive(site)} disabled={pending} className="min-h-11 px-3 text-sm font-semibold text-ink-muted hover:text-ink disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand">
                  {site.status === "archived" ? t("reactivate") : t("archive")}
                </button>
              </div>
            </div>

            {site.latitude != null && site.longitude != null ? (
              <p className="mt-3 text-xs text-brand-bright">{t("locationPin")}</p>
            ) : (
              <p className="mt-3 text-xs text-warning-soft">{t("noCoordinatesWarning")}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
