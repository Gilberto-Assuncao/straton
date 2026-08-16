import type { DashboardKpi, KpiIcon } from "@/lib/types/dashboard";

const iconPaths: Record<KpiIcon, string> = {
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87",
  approval: "M9 11l2 2 4-4M5 3h14v18H5V3Zm4 0v3h6V3",
  locations: "M3 7h18v13H3V7Zm0 4h18M8 7V4h8v3",
};

const stateStyles = {
  positive: "text-brand",
  neutral: "text-ink-muted",
  attention: "text-amber-300",
};

const badgeStyles = {
  positive: "bg-brand/10 text-brand",
  neutral: "bg-white/10 text-ink-muted",
  attention: "bg-amber-400/10 text-amber-300",
};

const borderStyles = {
  positive: "border-white/10",
  neutral: "border-white/10",
  attention: "border-amber-400/25",
};

export default function KpiCard({ kpi }: { kpi: DashboardKpi }) {
  const stateLabel = kpi.state === "positive" ? "Positive trend" : kpi.state === "attention" ? "Attention" : "No change";
  return (
    <article className={`group rounded-2xl border ${borderStyles[kpi.state]} bg-surface p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-xl hover:shadow-black/20`}>
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-ink-muted">{kpi.label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-ink">{kpi.value}</p></div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${badgeStyles[kpi.state]}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={iconPaths[kpi.icon]} /></svg></span>
      </div>
      <p className={`mt-4 flex items-center gap-2 text-xs font-medium ${stateStyles[kpi.state]}`}><span aria-hidden="true">{kpi.state === "positive" ? "↗" : kpi.state === "attention" ? "!" : "→"}</span><span className="sr-only">{stateLabel}: </span>{kpi.comparison}</p>
    </article>
  );
}
