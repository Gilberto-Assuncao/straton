"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapContainer } from "@/src/components/maps";
import { Icon } from "@/src/components/ui";
import { EmptyState } from "@/src/components/data-display";
import type { LivePresenceSite } from "@/src/features/operations/data";

/**
 * Who is clocked in right now, by chantier (#5, #61).
 *
 * The pins are the sites, not the people. A site has an address the company
 * entered and coordinates that belong to the company; a worker's phone position
 * belongs to the worker. Both answer "who is at Le Parc", only one of them also
 * answers questions nobody asked.
 */
function elapsed(minutes: number, t: ReturnType<typeof useTranslations<"liveMap">>): string {
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { count: minutes });
  return t("hoursAgo", { count: Math.round(minutes / 60) });
}

/**
 * Places each site in the placeholder grid, relative to the others.
 *
 * Still not a real basemap — that remains a provider decision (#54). What
 * changed is what is being placed: nine known sites rather than a live trace of
 * where individuals are standing.
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
    left: 10 + ((site.longitude! - Math.min(...lons)) / lonSpan) * 80,
    top: 10 + (1 - (site.latitude! - Math.min(...lats)) / latSpan) * 80,
  }));
}

export default function LiveOperationsMap({ sites }: { sites: LivePresenceSite[] }) {
  const t = useTranslations("liveMap");
  const [selected, setSelected] = useState<string | null>(null);

  if (!sites.length) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  const placed = layout(sites);
  const total = sites.reduce((sum, site) => sum + site.people.length, 0);

  return (
    <div className="grid gap-5">
      <p className="text-sm text-ink-muted">{t("clockedInNow", { count: total })}</p>

      {placed.length ? (
        <MapContainer label={t("mapLabel")}>
          <div className="relative h-72 w-full">
            {placed.map(({ site, left, top }) => {
              const isSelected = selected === site.siteId;
              return (
                <button
                  key={site.siteId}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : site.siteId)}
                  className="absolute -translate-x-1/2 -translate-y-full cursor-pointer bg-transparent p-0"
                  style={{ left: `${left}%`, top: `${top}%`, zIndex: isSelected ? 20 : 10 }}
                >
                  <span
                    role="img"
                    aria-label={t("peopleAtSite", { count: site.people.length, site: site.siteName ?? "" })}
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full font-mono text-sm font-bold text-on-brand shadow-lg transition-transform ${
                      isSelected ? "scale-125 bg-brand-bright ring-4 ring-brand-bright/40" : "bg-brand"
                    }`}
                  >
                    {site.people.length}
                  </span>
                  <span
                    className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-deep px-2 py-1 text-xs font-medium text-ink shadow transition-opacity ${
                      isSelected ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  >
                    {site.siteName}
                  </span>
                </button>
              );
            })}
          </div>
        </MapContainer>
      ) : null}

      <ul className="grid gap-3">
        {sites.map((site) => (
          <li
            key={site.siteId ?? "no-site"}
            className={`rounded-xl border p-4 ${site.siteId ? "border-edge-10 bg-surface" : "border-amber-400/25 bg-amber-400/[0.04]"}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={`font-semibold ${site.siteId ? "text-ink" : "text-amber-200"}`}>
                {site.siteName ?? t("noSite")}
              </p>
              <p className="text-xs text-ink-muted">
                {site.projectName ? `${site.projectName} · ` : ""}
                {t("peopleCount", { count: site.people.length })}
              </p>
            </div>
            <ul className="mt-3 grid gap-2">
              {site.people.map((person) => (
                <li key={person.userId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-ink">
                    <span className="inline-flex h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                    {person.name}
                  </span>
                  <span className="text-xs text-ink-muted">{t("workingFor", { time: elapsed(person.minutesElapsed, t) })}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="flex items-start gap-2 text-xs text-ink-subtle">
        <Icon name="location" />
        {/* Said plainly, because the previous version did track people. */}
        {t("sitePinsOnly")}
      </p>
    </div>
  );
}
