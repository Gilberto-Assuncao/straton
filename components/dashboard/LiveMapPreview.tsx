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
  const shown = points.slice(0, 6);
  const placed = layout(shown);

  return (
    <section aria-labelledby="live-map-preview-title" className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 id="live-map-preview-title" className="text-lg font-semibold text-[#E5E7EB]">Live Map</h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">Where team members clocked in today</p>
        </div>
        <Link href="/dashboard/map" className="text-xs font-semibold text-[#4ADE80] hover:text-[#22C55E]">View full map →</Link>
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-center text-sm text-[#6B7280]">
          No one has clocked in with location sharing today.
        </div>
      ) : (
        <div className="relative mt-5 h-40 overflow-hidden rounded-xl border border-white/10 bg-[#0F172A]">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "linear-gradient(#22C55E 1px,transparent 1px),linear-gradient(90deg,#22C55E 1px,transparent 1px)", backgroundSize: "1.5rem 1.5rem" }}
          />
          {placed.map(({ point, left, top }) => (
            <div key={point.userId} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${left}%`, top: `${top}%` }} title={`${point.name} · ${point.siteName ?? "No site"}`}>
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#4ADE80]" />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
