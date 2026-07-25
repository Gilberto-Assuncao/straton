"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { LiveOperationsPoint } from "@/src/features/operations/data";

// Same relative-layout approach as the full map page: no basemap library
// wired up yet, so points are placed proportionally within the card by
// their lat/lon spread rather than on a real projection.
function layout(points: LiveOperationsPoint[]) {
  if (points.length <= 1) return points.map((point) => ({ point, left: 50, top: 50 }));
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const latSpan = Math.max(Math.max(...lats) - Math.min(...lats), 0.001);
  const lonSpan = Math.max(Math.max(...lons) - Math.min(...lons), 0.001);
  return points.map((point) => ({
    point,
    left: 12 + ((point.longitude - Math.min(...lons)) / lonSpan) * 76,
    top: 15 + (1 - (point.latitude - Math.min(...lats)) / latSpan) * 70,
  }));
}

export default function LiveMapPreview({ points }: { points: LiveOperationsPoint[] }) {
  const t = useTranslations("dashboard");
  const [selected, setSelected] = useState<string | null>(null);
  const shown = points.slice(0, 6);
  const placed = layout(shown);

  return (
    <section aria-labelledby="live-map-preview-title" className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 id="live-map-preview-title" className="text-lg font-semibold text-[#E5E7EB]">{t("liveMapTitle")}</h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">{t("liveMapSubtitle")}</p>
        </div>
        <Link href="/dashboard/map" className="text-xs font-semibold text-[#4ADE80] hover:text-[#22C55E]">{t("liveMapViewFull")} →</Link>
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-sm text-[#6B7280]">
          {t("liveMapEmpty")}
        </div>
      ) : (
        <>
          <div className="relative mt-5 h-40 overflow-visible rounded-xl border border-white/10 bg-[#0F172A]">
            <div
              className="absolute inset-0 overflow-hidden rounded-xl opacity-20"
              style={{ backgroundImage: "linear-gradient(#22C55E 1px,transparent 1px),linear-gradient(90deg,#22C55E 1px,transparent 1px)", backgroundSize: "1.5rem 1.5rem" }}
            />
            {placed.map(({ point, left, top }) => {
              const isSelected = selected === point.userId;
              return (
                <button
                  key={point.userId}
                  type="button"
                  onClick={() => setSelected(isSelected ? null : point.userId)}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 bg-transparent p-0"
                  style={{ left: `${left}%`, top: `${top}%`, zIndex: isSelected ? 10 : 1 }}
                >
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#4ADE80]" />
                  </span>
                  {isSelected ? (
                    <span className="whitespace-nowrap rounded-lg border border-white/15 bg-[#0B1220] px-2.5 py-1.5 text-xs font-semibold text-[#F1F5F9] shadow-lg shadow-black/40">
                      {point.name} · {point.siteName ?? t("liveMapNoSite")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-col gap-1">
            {shown.map((point) => (
              <button
                key={point.userId}
                type="button"
                onClick={() => setSelected(selected === point.userId ? null : point.userId)}
                className="flex items-center justify-between rounded-lg px-1.5 py-1 text-left hover:bg-white/5"
              >
                <span className="flex items-center gap-2 text-xs font-medium text-[#E5E7EB]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ADE80]" />
                  {point.name}
                </span>
                <span className="text-xs text-[#4ADE80]">{t("liveMapActive")}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
