"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { LivePresenceSite } from "@/src/features/operations/data";

/**
 * The dashboard's glance at who is on the clock, by site (#5, #61).
 *
 * Same change as the full map: the dot is a chantier with people at it, not a
 * person with a coordinate. And it is now genuinely live — it reads open
 * sessions rather than the last session somebody already finished.
 */
function layout(sites: LivePresenceSite[]) {
  const located = sites.filter((site) => site.latitude != null && site.longitude != null);
  if (located.length <= 1) return located.map((site) => ({ site, left: 50, top: 50 }));

  const lats = located.map((site) => site.latitude!);
  const lons = located.map((site) => site.longitude!);
  const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), 0.001);
  const lonSpan = Math.max(Math.max(...lons) - Math.min(...lons), 0.001);

  return located.map((site) => ({
    site,
    left: 12 + ((site.longitude! - Math.min(...lons)) / lonSpan) * 76,
    top: 15 + (1 - (site.latitude! - Math.min(...lats)) / latSpan) * 70,
  }));
}

export default function LiveMapPreview({ sites }: { sites: LivePresenceSite[] }) {
  const t = useTranslations("dashboard");
  const [selected, setSelected] = useState<string | null>(null);
  const shown = sites.slice(0, 6);
  const placed = layout(shown);
  const total = sites.reduce((sum, site) => sum + site.people.length, 0);

  return (
    <section aria-labelledby="live-map-preview-title" className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 id="live-map-preview-title" className="text-lg font-semibold text-ink">
            {t("liveMapTitle")}
          </h3>
          <p className="mt-1 text-xs text-ink-muted">{t("liveMapSubtitle")}</p>
        </div>
        <Link href="/dashboard/map" className="text-xs font-semibold text-brand-bright hover:text-brand-bright">
          {t("liveMapViewFull")} →
        </Link>
      </div>

      {total === 0 ? (
        <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-dashed border-edge-10 text-center text-sm text-ink-subtle">
          {t("liveMapEmpty")}
        </div>
      ) : (
        <>
          {placed.length ? (
            <div className="relative mt-5 h-40 overflow-visible rounded-xl border border-edge-10 bg-surface-deep">
              <div
                className="absolute inset-0 overflow-hidden rounded-xl opacity-20"
                style={{
                  backgroundImage: "linear-gradient(#22C55E 1px,transparent 1px),linear-gradient(90deg,#22C55E 1px,transparent 1px)",
                  backgroundSize: "1.5rem 1.5rem",
                }}
              />
              {placed.map(({ site, left, top }) => {
                const isSelected = selected === site.siteId;
                return (
                  <button
                    key={site.siteId}
                    type="button"
                    onClick={() => setSelected(isSelected ? null : site.siteId)}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 bg-transparent p-0"
                    style={{ left: `${left}%`, top: `${top}%`, zIndex: isSelected ? 10 : 1 }}
                  >
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-bright" />
                    </span>
                    {isSelected ? (
                      <span className="whitespace-nowrap rounded-lg border border-edge-15 bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink-bright shadow-lg shadow-black/40">
                        {site.siteName} · {t("liveMapPeople", { count: site.people.length })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-1">
            {shown.map((site) => (
              <button
                key={site.siteId ?? "no-site"}
                type="button"
                onClick={() => setSelected(selected === site.siteId ? null : site.siteId)}
                className="flex items-center justify-between rounded-lg px-1.5 py-1 text-left hover:bg-edge-5"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-bright" />
                  {site.siteName ?? t("liveMapNoSite")}
                </span>
                <span className="text-xs text-brand-bright">{t("liveMapPeople", { count: site.people.length })}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
