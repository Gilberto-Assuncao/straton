import Link from "next/link";
import type { DashboardTone, RoleDashboardOverview } from "@/src/features/dashboard/data";

/**
 * A tone becomes a token here, and nowhere else.
 *
 * Written out in full rather than assembled — `text-${tone}` produces a class
 * name Tailwind never sees at build time, so the utility is never generated
 * and the colour silently does not exist. The repetition is the price of the
 * scanner being able to read this.
 *
 * `neutral` is `ink-dim` on purpose: a trend that is neither good nor bad
 * should recede, not compete with the number it sits beside.
 */
const TONE: Record<DashboardTone, { text: string; edge: string; dot: string }> = {
  ok: { text: "text-success", edge: "border-l-success", dot: "bg-success" },
  warn: { text: "text-warning-soft", edge: "border-l-warning-soft", dot: "bg-warning-soft" },
  danger: { text: "text-danger-soft", edge: "border-l-danger-soft", dot: "bg-danger-soft" },
  neutral: { text: "text-ink-dim", edge: "border-l-edge-25", dot: "bg-ink-dim" },
};

export default function RoleOverview({ overview }: { overview: RoleDashboardOverview }) {
  if (!overview.roleView) return null;
  const { headline, subheadline, attentionTitle, kpis, attention } = overview;

  return (
    <div className="grid min-w-0 gap-6">
      <div>
        <h2 className="text-xl font-bold text-ink">{headline}</h2>
        <p className="mt-1 text-sm text-ink-dim">{subheadline}</p>
      </div>

      {/*
        What needs doing comes before what happened. This block used to sit
        under four KPI cards, a chart and a map; on a phone that is a lot of
        scrolling before the one list that asks anything of the reader.
      */}
      {attention.length ? (
        <div className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6">
          <p className="mb-4 text-base font-semibold text-ink">{attentionTitle}</p>
          <ul className="grid gap-3">
            {attention.map((item) => (
              <li
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-[3px] ${TONE[item.tone].edge} bg-surface-inset py-4 pl-4 pr-4`}
              >
                <span className="flex min-w-0 items-center gap-3 text-sm text-ink">
                  <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${TONE[item.tone].dot}`} />
                  {item.text}
                </span>
                {/* A button, not an arrow: the action is the point of the row. */}
                <Link
                  href={item.ctaHref}
                  className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg bg-brand px-4 text-sm font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {item.cta}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Link
            key={kpi.id}
            href={kpi.ctaHref}
            /* The whole card is the link. A 13px arrow is not a target for
               somebody holding a phone in the rain. */
            className="block rounded-2xl border border-edge-10 bg-surface p-5 transition hover:border-edge-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <p className="text-sm text-ink-dim">{kpi.label}</p>
            <p className={`mt-2 text-4xl font-bold tabular-nums ${TONE[kpi.tone].text}`}>{kpi.value}</p>
            <p className={`mt-2 text-xs font-semibold ${TONE[kpi.trendTone].text}`}>{kpi.trend}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
