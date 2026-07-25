import Link from "next/link";
import type { RoleDashboardOverview } from "@/src/features/dashboard/data";

export default function RoleOverview({ overview }: { overview: RoleDashboardOverview }) {
  if (!overview.roleView) return null;
  const { headline, subheadline, kpis, attention } = overview;

  return (
    <div className="mb-4 grid min-w-0 gap-4">
      <div>
        <h2 className="text-xl font-bold text-[#E5E7EB]">{headline}</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">{subheadline}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="rounded-2xl border border-white/10 bg-[#161A34] p-5">
            <p className="text-xs text-[#94A3B8]">{kpi.label}</p>
            <p className="mt-3 font-mono text-[28px] font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            <div className="mt-2.5 flex items-center justify-between">
              <Link href={kpi.ctaHref} className="text-[13px] font-semibold text-[#4ADE80] hover:text-[#22C55E]">{kpi.cta} →</Link>
              <span className="text-[11px] font-semibold" style={{ color: kpi.trendColor }}>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {attention.length ? (
        <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5">
          <p className="mb-3.5 text-sm font-semibold text-[#E5E7EB]">Precisa da sua atenção</p>
          <div className="grid gap-2.5">
            {attention.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-[#111C33] py-3.5 pl-4 pr-4" style={{ borderLeft: `3px solid ${item.accent}` }}>
                <span className="flex items-center gap-2.5 text-sm text-[#E5E7EB]"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.accent }} />{item.text}</span>
                <Link href={item.ctaHref} className="whitespace-nowrap text-[13px] font-semibold text-[#4ADE80] hover:text-[#22C55E]">{item.cta} →</Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
