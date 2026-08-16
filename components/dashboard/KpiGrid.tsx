import { getTranslations } from "next-intl/server";
import type { DashboardKpi } from "@/lib/types/dashboard";
import KpiCard from "./KpiCard";

export default async function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  if (kpis.length === 0) {
    const t = await getTranslations("dashboard");
    return <div className="rounded-2xl border border-dashed border-white/15 bg-surface p-8 text-center text-sm text-ink-muted">{t("kpiEmpty")}</div>;
  }
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}</div>;
}
