import { Badge, EmptyState, MetricCard } from "@/src/components/data-display";
import type { DivergenceRow, SiteHoursRow } from "@/src/features/reports/data";

type Props = { teams: string[]; divergence: DivergenceRow[]; siteHours: SiteHoursRow[] };

export default function HoursDivergenceReport({ teams, divergence, siteHours }: Props) {
  const flaggedCount = divergence.filter((row) => row.flagged).length;
  const totalHours = Math.round(divergence.reduce((sum, row) => sum + row.hours, 0) * 100) / 100;

  return <div className="grid gap-5">
    <dl className="grid gap-4 sm:grid-cols-3">
      <MetricCard label="Teams this week" value={teams.length} detail="With at least one logged entry" />
      <MetricCard label="Total hours" value={`${totalHours}h`} detail="Across all members" />
      <MetricCard label="Flagged members" value={flaggedCount} detail="±20% from their team's average" />
    </dl>

    <section aria-labelledby="divergence-title" className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
      <h2 id="divergence-title" className="text-lg font-semibold text-ink">Hours worked by team member — this week</h2>
      {divergence.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
        <thead><tr className="border-b border-white/10 text-xs uppercase tracking-wide text-ink-muted">
          <th className="py-2 pr-4">Team</th><th className="py-2 pr-4">Member</th><th className="py-2 pr-4">Hours</th><th className="py-2 pr-4">Team average</th><th className="py-2 pr-4">Divergence</th>
        </tr></thead>
        <tbody>{divergence.map((row) => <tr key={row.membershipId} className="border-b border-white/5 text-ink">
          <td className="py-2 pr-4">{row.team}</td>
          <td className="py-2 pr-4">{row.member}</td>
          <td className="py-2 pr-4">{row.hours}h</td>
          <td className="py-2 pr-4 text-ink-muted">{row.teamAverageHours}h</td>
          <td className="py-2 pr-4">{row.flagged ? <Badge tone={row.divergencePercent > 0 ? "info" : "warning"}>{row.divergencePercent > 0 ? "+" : ""}{row.divergencePercent}%</Badge> : <span className="text-ink-muted">{row.divergencePercent > 0 ? "+" : ""}{row.divergencePercent}%</span>}</td>
        </tr>)}</tbody>
      </table></div> : <div className="mt-4"><EmptyState title="No hours logged this week" description="Once team members log time, divergence from their team's average will show up here." /></div>}
    </section>

    <section aria-labelledby="site-hours-title" className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
      <h2 id="site-hours-title" className="text-lg font-semibold text-ink">Hours by site — this week</h2>
      {siteHours.length ? <ul className="mt-4 grid gap-2">{siteHours.map((row) => <li key={row.site} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2 text-sm"><span className="text-ink">{row.site}</span><span className="font-semibold text-ink-muted">{row.hours}h</span></li>)}</ul>
        : <div className="mt-4"><EmptyState title="No site hours yet" description="Time entries linked to a site will be summarized here." /></div>}
    </section>
  </div>;
}
