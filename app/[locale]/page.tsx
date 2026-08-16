import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "STRATON — Time well managed" };

const SUPPORT_EMAIL = "contact@belnexenergy.be";

const scheduleRows = [
  { name: "Maria Silva", city: "Brussels", hours: "8h 22min", statusKey: "present" as const, initials: "MS", color: "bg-violet-500" },
  { name: "Carlos Mendes", city: "Antwerp", hours: "7h 45min", statusKey: "present" as const, initials: "CM", color: "bg-sky-500" },
  { name: "Ana Costa", city: "Ghent", hours: "9h 10min", statusKey: "present" as const, initials: "AC", color: "bg-amber-500" },
  { name: "Pedro Lima", city: "Liège", hours: "0h 00min", statusKey: "absent" as const, initials: "PL", color: "bg-rose-500" },
];

const timesheetRows = [
  { name: "Maria Silva", dept: "Field", in: "07:52", out: "17:30", extra: "+1h 38min", statusKey: "normal" as const, tone: "text-brand-bright" },
  { name: "Carlos Mendes", dept: "Operations", in: "08:01", out: "17:00", extra: "+0h 59min", statusKey: "normal" as const, tone: "text-brand-bright" },
  { name: "Ana Costa", dept: "Supervision", in: "07:30", out: "18:10", extra: "+2h 40min", statusKey: "extra" as const, tone: "text-amber-300" },
  { name: "Pedro Lima", dept: "Field", in: "—", out: "—", extra: "—", statusKey: "absent" as const, tone: "text-red-300" },
  { name: "Lúcia Ferreira", dept: "Technical", in: "08:15", out: "17:15", extra: "+1h 00min", statusKey: "normal" as const, tone: "text-brand-bright" },
];

const weeklyHours = [
  { dayKey: "mon" as const, value: 45 },
  { dayKey: "tue" as const, value: 55 },
  { dayKey: "wed" as const, value: 40 },
  { dayKey: "thu" as const, value: 90 },
  { dayKey: "fri" as const, value: 60 },
  { dayKey: "sat" as const, value: 30 },
  { dayKey: "sun" as const, value: 20 },
];

const workSites = [
  { name: "Central Site", top: "18%", left: "58%", status: "active" as const, workers: ["Maria Silva"] },
  { name: "North Yard", top: "42%", left: "72%", status: "active" as const, workers: ["Carlos Mendes", "Ana Costa"] },
  { name: "South Depot", top: "60%", left: "40%", status: "finished" as const, workers: ["Pedro Lima"] },
];

const phoneHistory = ["mon", "tue", "wed"] as const;

export default async function Home() {
  const t = await getTranslations("landing");
  const currentYear = new Date().getFullYear();

  return (
    <div className={`${styles.page} min-h-screen bg-canvas text-ink-bright`}>
      {/* Fixed top navbar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3">
            <StratonMark className="h-11 w-11" />
            <span className={`${styles.heading} text-3xl font-bold tracking-wide text-white`}>STRATON</span>
          </div>
          <nav className="hidden items-center gap-9 text-base font-medium text-ink-dim md:flex">
            <a href="#funcionalidades" className="transition hover:text-white">{t("nav.features")}</a>
            <a href="#georreferenciamento" className="transition hover:text-white">{t("nav.geolocation")}</a>
            <a href="#painel" className="transition hover:text-white">{t("nav.dashboard")}</a>
            <a href="#cadeia" className="transition hover:text-white">{t("nav.chain")}</a>
          </nav>
          <div className="hidden items-center gap-5 sm:flex">
            <Link href="/login" className="text-base font-semibold text-ink-dim transition hover:text-white">{t("nav.login")}</Link>
            <Link href="/register" className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-base font-semibold text-on-brand transition hover:bg-brand-hover">{t("nav.cta")}</Link>
          </div>
          <details className="group md:hidden">
            <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-white/15 text-ink-bright [&::-webkit-details-marker]:hidden">
              <span className="sr-only">Menu</span>
              <span aria-hidden="true" className="relative h-4 w-5">
                <span className="absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform group-open:translate-y-[7px] group-open:rotate-45" />
                <span className="absolute left-0 top-[7px] h-0.5 w-5 bg-current transition-opacity group-open:opacity-0" />
                <span className="absolute left-0 top-[14px] h-0.5 w-5 bg-current transition-transform group-open:-translate-y-[7px] group-open:-rotate-45" />
              </span>
            </summary>
            <div className="absolute left-5 right-5 top-[64px] overflow-hidden rounded-2xl border border-white/10 bg-surface-deep p-3 shadow-2xl shadow-black/40">
              <nav className="grid">
                <a href="#funcionalidades" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-dim hover:bg-white/5 hover:text-white">{t("nav.features")}</a>
                <a href="#georreferenciamento" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-dim hover:bg-white/5 hover:text-white">{t("nav.geolocation")}</a>
                <a href="#painel" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-dim hover:bg-white/5 hover:text-white">{t("nav.dashboard")}</a>
                <a href="#cadeia" className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-dim hover:bg-white/5 hover:text-white">{t("nav.chain")}</a>
              </nav>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm font-semibold text-ink-bright">{t("nav.login")}</Link>
                <Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-3 text-sm font-semibold text-on-brand">{t("nav.cta")}</Link>
              </div>
            </div>
          </details>
        </div>
      </header>

      {/* Hero */}
      <section className={`${styles.heroBg} overflow-hidden px-6 pb-28 pt-24 sm:px-10`}>
        <div className={`${styles.glowBlob} h-72 w-72`} style={{ top: "10%", right: "8%" }} />
        <div className="relative mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-semibold text-brand-bright">
              <PinIcon className="h-4 w-4" /> {t("hero.badge")}
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.1] sm:text-6xl">
              {t("hero.titleLine1")} <br />
              <span className="text-brand-bright">{t("hero.titleHighlight")}</span> {t("hero.titleLine2")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-ink-dim sm:text-lg">{t("hero.description")}</p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <Link href="/register" className="inline-flex min-h-14 items-center rounded-lg bg-brand px-7 text-base font-semibold text-on-brand transition hover:bg-brand-hover">
                {t("hero.ctaPrimary")}
              </Link>
              <a href="#funcionalidades" className="inline-flex items-center gap-1.5 text-base font-semibold text-ink-dim transition hover:text-white">
                {t("hero.ctaSecondary")} <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="mt-9 flex items-center gap-3">
              <div className="flex -space-x-2">
                {scheduleRows.map((row) => (
                  <span key={row.name} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-canvas text-xs font-bold text-white ${row.color}`}>
                    {row.initials}
                  </span>
                ))}
              </div>
              <p className="text-sm text-ink-dim">
                <span className="text-amber-300">★★★★★</span> {t("hero.socialProof")}
              </p>
            </div>
          </div>

          <div className={`${styles.floatCard} relative rounded-2xl border border-white/10 bg-surface-deep/80 p-6 shadow-2xl shadow-black/40 backdrop-blur`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-ink-bright">{t("live.title")}</p>
                <p className="text-xs text-ink-faint">{t("live.timestamp")}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-bright">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {t("live.liveBadge")}
              </span>
            </div>
            <ul className="mt-5 space-y-2.5">
              {scheduleRows.map((row) => (
                <li key={row.name} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3.5 py-2.5 text-sm">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${row.color}`}>{row.initials}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-bright">{row.name}</span>
                    <span className="block text-xs text-ink-faint">{row.city}</span>
                  </span>
                  <span className="text-right text-sm">
                    <span className="block font-semibold text-ink-bright">{row.hours}</span>
                    <span className={`font-semibold ${row.statusKey === "present" ? "text-brand-bright" : "text-red-300"}`}>{t(`status.${row.statusKey}`)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-right text-sm text-brand-bright">{t("live.viewAll")} →</p>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section id="funcionalidades" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-semibold text-brand-bright">{t("features.eyebrow")}</span>
          <h2 className="mt-5 text-4xl font-bold sm:text-5xl">{t("features.title")}</h2>
          <p className="mt-4 text-base text-ink-dim sm:text-lg">{t("features.description")}</p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {(["card1", "card2", "card3"] as const).map((cardKey, index) => {
            const Icon = [PinIcon, ChartIcon, ClockIcon][index];
            return (
              <div key={cardKey} className="rounded-2xl border-t-2 border-t-brand bg-surface-deep/80 p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-brand-bright">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink-bright">{t(`features.${cardKey}.title`)}</h3>
                <p className="mt-2.5 text-sm leading-6 text-ink-dim">{t(`features.${cardKey}.description`)}</p>
                <ul className="mt-5 space-y-2.5 text-sm text-ink-dim">
                  {(["bullet1", "bullet2", "bullet3"] as const).map((bulletKey) => (
                    <li key={bulletKey} className="flex items-start gap-2">
                      <span className="mt-0.5 text-brand-bright">✓</span> {t(`features.${cardKey}.${bulletKey}`)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Time & Attendance: live GPS clock-in card */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-sm font-semibold uppercase tracking-wider text-brand-bright">{t("presence.eyebrow")}</span>
            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">{t("presence.title")}</h2>
            <p className="mt-4 text-base leading-7 text-ink-dim">{t("presence.description")}</p>
            <p className="mt-6 inline-flex items-center gap-1.5 text-base font-semibold text-brand-bright">{t("presence.cta")} <span aria-hidden="true">→</span></p>
          </div>

          <div className={`${styles.floatCard} rounded-2xl border border-white/10 bg-surface-deep/80 p-7 shadow-2xl shadow-black/40 backdrop-blur`}>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-ink-bright">{t("presence.timerTitle")}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-bright">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> {t("presence.timerLive")}
              </span>
            </div>
            <p className={`${styles.mono} mt-5 text-6xl font-bold text-ink-bright`}>
              04:12<span className="text-3xl text-ink-faint">:37</span>
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-bright"><PinIcon className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-semibold text-ink-bright">{t("presence.site")}</p>
                <p className={`${styles.mono} text-xs text-ink-faint`}>{t("presence.locationVerified")}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/[0.03] px-4 py-3.5">
                <p className="text-sm text-ink-dim">{t("presence.entrance")}</p>
                <p className={`${styles.mono} mt-1 text-lg font-semibold text-ink-bright`}>07:58</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] px-4 py-3.5">
                <p className="text-sm text-ink-dim">{t("presence.pause")}</p>
                <p className={`${styles.mono} mt-1 text-lg font-semibold text-ink-bright`}>32min</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard section with a full browser-window style mock */}
      <section id="painel" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="mb-12 max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wider text-brand-bright">{t("dashboardMock.eyebrow")}</span>
          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">{t("dashboardMock.title")}</h2>
          <p className="mt-4 text-base leading-7 text-ink-dim">{t("dashboardMock.description")}</p>
          <ul className="mt-6 space-y-2.5 text-base text-ink-dim">
            <li>✓ {t("dashboardMock.bullet1")}</li>
            <li>✓ {t("dashboardMock.bullet2")}</li>
            <li>✓ {t("dashboardMock.bullet3")}</li>
            <li>✓ {t("dashboardMock.bullet4")}</li>
          </ul>
        </div>

        <div className={`${styles.floatCard} overflow-hidden rounded-2xl border border-white/10 bg-surface-deep shadow-2xl shadow-black/50`}>
          <div className="flex items-center gap-2 border-b border-white/5 bg-[#0a0f1c] px-5 py-3.5">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-brand/70" />
            <span className={`${styles.mono} ml-3 text-xs text-ink-faint`}>straton.app/dashboard</span>
          </div>
          <div className="p-7">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-white/[0.03] p-5"><p className="text-3xl font-bold text-brand-bright">21</p><p className="mt-1.5 text-sm text-ink-dim">{t("dashboardMock.kpiPresent")}</p></div>
              <div className="rounded-lg bg-white/[0.03] p-5"><p className="text-3xl font-bold text-red-300">3</p><p className="mt-1.5 text-sm text-ink-dim">{t("dashboardMock.kpiAbsent")}</p></div>
              <div className="rounded-lg bg-white/[0.03] p-5"><p className="text-3xl font-bold text-ink-bright">168h</p><p className="mt-1.5 text-sm text-ink-dim">{t("dashboardMock.kpiHoursToday")}</p></div>
              <div className="rounded-lg bg-white/[0.03] p-5"><p className="text-3xl font-bold text-amber-300">+12h</p><p className="mt-1.5 text-sm text-ink-dim">{t("dashboardMock.kpiExtra")}</p></div>
            </div>

            <div className="mt-7 rounded-xl bg-white/[0.02] p-5">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-ink-bright">{t("dashboardMock.chartTitle")}</p>
                <p className="text-sm text-ink-faint">{t("dashboardMock.chartRange")}</p>
              </div>
              <div className="mt-5 flex h-32 items-end gap-3">
                {weeklyHours.map((entry, index) => (
                  <div key={entry.dayKey} className="flex h-full flex-1 flex-col items-end gap-2">
                    <div
                      className={`w-full rounded-t ${index === 3 ? "bg-gradient-to-t from-brand-hover to-brand-bright" : "bg-[#134430]"}`}
                      style={{ height: `${entry.value}%` }}
                    />
                    <span className="text-xs text-ink-faint">{t(`days.${entry.dayKey}`)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-white/[0.02] text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">{t("dashboardMock.colEmployee")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("dashboardMock.colDept")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("dashboardMock.colEntry")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("dashboardMock.colExit")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("dashboardMock.colExtra")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("dashboardMock.colStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {timesheetRows.map((row) => (
                    <tr key={row.name}>
                      <td className="px-5 py-3.5 font-medium text-ink-bright">{row.name}</td>
                      <td className="px-5 py-3.5 text-ink-dim">{row.dept}</td>
                      <td className={`${styles.mono} px-5 py-3.5 text-ink-dim`}>{row.in}</td>
                      <td className={`${styles.mono} px-5 py-3.5 text-ink-dim`}>{row.out}</td>
                      <td className={`${styles.mono} px-5 py-3.5 ${row.tone}`}>{row.extra}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full bg-white/[0.05] px-3 py-1 text-xs font-semibold ${row.tone}`}>{t(`status.${row.statusKey}`)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Live map with pulsing dots */}
      <section id="georreferenciamento" className="scroll-mt-24 mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-bright">
              <PinIcon className="h-4 w-4" /> {t("map.eyebrow")}
            </span>
            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">{t("map.title")}</h2>
            <p className="mt-4 text-base leading-7 text-ink-dim">{t("map.description")}</p>
          </div>

          <div className={`${styles.mapGrid} relative h-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0a1120]`}>
            <span className={`${styles.mono} absolute left-4 top-4 text-xs text-ink-faint`}>50.8503° N 4.3517° E</span>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={workSites.map((site) => `${parseFloat(site.left)},${parseFloat(site.top)}`).join(" ")}
                fill="none"
                stroke="rgba(74, 222, 128, 0.45)"
                strokeWidth="0.6"
                strokeDasharray="2,2"
              />
            </svg>
            {workSites.map((site) => (
              <div key={site.name} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ top: site.top, left: site.left }}>
                <div
                  className={`${site.status === "active" ? styles.radarDot : ""} flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                    site.status === "active" ? "bg-brand" : "bg-ink-faint"
                  }`}
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-surface-deep px-2.5 py-1.5 text-sm font-medium text-ink-bright shadow">
                  {site.name} <span className="text-xs font-normal text-ink-dim">· {site.status === "active" ? t("map.activeState") : t("map.finishedState")}</span>
                </span>
                <div className="pointer-events-none absolute left-5 top-full mt-2 w-max max-w-[220px] rounded-md border border-white/10 bg-surface-inset px-3 py-2 text-xs text-ink-bright opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                  <p className="font-semibold text-ink-dim">{t("map.whoWorkedHere")}</p>
                  {site.workers.map((worker) => (
                    <p key={worker}>{worker}</p>
                  ))}
                </div>
              </div>
            ))}
            <span className={`${styles.mono} absolute bottom-4 left-4 text-xs text-ink-faint`}>
              {workSites.filter((s) => s.status === "active").length} {t("map.activeSites")} · {workSites.filter((s) => s.status === "finished").length} {t("map.finishedSites")}
            </span>
          </div>
        </div>
      </section>


      {/* Subcontracting chain: A delegates to B, B staffs it, and the hours
          land back on A's timesheet. This is the capability competitors built
          for single organisations do not have, so it gets its own section. */}
      <section id="cadeia" className="scroll-mt-24 border-y border-white/10 bg-surface-deep/40">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-semibold text-brand-bright">{t("chain.badge")}</span>
            <h2 className={`${styles.heading} mt-5 text-4xl font-bold sm:text-5xl`}>{t("chain.title")}</h2>
            <p className="mt-5 text-lg leading-8 text-ink-dim">{t("chain.subtitle")}</p>
          </div>

          <ol className="mt-16 grid gap-6 md:grid-cols-3">
            {["one", "two", "three"].map((step, index) => (
              <li key={step} className="relative rounded-2xl border border-white/10 bg-canvas p-7">
                <span className={`${styles.mono} inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand-bright`}>{index + 1}</span>
                <h3 className="mt-5 text-xl font-semibold text-white">{t(`chain.${step}Title`)}</h3>
                <p className="mt-3 text-base leading-7 text-ink-dim">{t(`chain.${step}Body`)}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl border border-white/10 bg-canvas p-7 sm:p-9">
            <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
              <div className="flex-1 rounded-xl border border-brand/25 bg-brand/[0.06] p-5 text-center">
                <p className={`${styles.mono} text-xs uppercase tracking-wide text-brand-bright`}>{t("chain.flowYou")}</p>
                <p className="mt-2 text-base font-semibold text-white">{t("chain.flowYouLabel")}</p>
              </div>
              <span aria-hidden="true" className="self-center text-2xl text-brand-bright lg:rotate-0 rotate-90">→</span>
              <div className="flex-1 rounded-xl border border-white/15 bg-surface-inset p-5 text-center">
                <p className={`${styles.mono} text-xs uppercase tracking-wide text-ink-dim`}>{t("chain.flowPartner")}</p>
                <p className="mt-2 text-base font-semibold text-white">{t("chain.flowPartnerLabel")}</p>
              </div>
              <span aria-hidden="true" className="self-center text-2xl text-brand-bright lg:rotate-0 rotate-90">→</span>
              <div className="flex-1 rounded-xl border border-brand/25 bg-brand/[0.06] p-5 text-center">
                <p className={`${styles.mono} text-xs uppercase tracking-wide text-brand-bright`}>{t("chain.flowBack")}</p>
                <p className="mt-2 text-base font-semibold text-white">{t("chain.flowBackLabel")}</p>
              </div>
            </div>
            <p className="mt-7 border-t border-white/10 pt-6 text-sm leading-7 text-ink-dim">
              <span className="font-semibold text-ink">{t("chain.privacyLabel")}</span> {t("chain.privacyBody")}
            </p>
          </div>
        </div>
      </section>

      {/* App section: the mobile experience, shown as three phone states */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-semibold text-brand-bright">{t("phone.badge")}</span>
          <h2 className="mt-5 text-4xl font-bold sm:text-5xl">{t("phone.title")}</h2>
          <p className="mt-4 text-base text-ink-dim sm:text-lg">{t("phone.description")}</p>
        </div>
        <div className="mt-14 flex flex-wrap items-start justify-center gap-8">
          <PhoneMock label={t("phone.step1Label")}>
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-brand-bright"><PinIcon className="h-7 w-7" /></span>
              <p className="text-xs text-ink-dim">{t("phone.step1Site")}</p>
              <button type="button" className="min-h-9 rounded-full bg-brand px-5 text-xs font-semibold text-on-brand">{t("phone.step1Button")}</button>
            </div>
          </PhoneMock>
          <PhoneMock label={t("phone.step2Label")}>
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-2xl text-brand-bright">✓</span>
              <p className="text-sm font-semibold text-ink-bright">{t("phone.step2Title")}</p>
              <p className="text-xs text-ink-dim">{t("phone.step2Description")}</p>
            </div>
          </PhoneMock>
          <PhoneMock label={t("phone.step3Label")}>
            <div className="flex h-full flex-col gap-2 px-1 py-2">
              {phoneHistory.map((dayKey) => (
                <div key={dayKey} className="rounded-lg bg-white/[0.05] px-2 py-1.5 text-[10px] text-ink-dim">{t(`days.${dayKey}`)} · 8h 10min</div>
              ))}
            </div>
          </PhoneMock>
        </div>
      </section>

      {/* Capability grid */}
      <section className="border-y border-white/10 bg-surface-deep/40">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold sm:text-5xl">{t("capability.title")}</h2>
            <p className="mt-4 text-base text-ink-dim sm:text-lg">{t("capability.description")}</p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(["card1", "card2", "card3", "card4", "card5", "card6"] as const).map((cardKey, index) => {
              const Icon = [BriefcaseIcon, GlobeIcon, CloudIcon, TrendIcon, MailIcon, ShieldIcon][index];
              return (
                <div key={cardKey} className="rounded-2xl border border-white/10 bg-surface-deep/80 p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand-bright">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-ink-bright">{t(`capability.${cardKey}.title`)}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-dim">{t(`capability.${cardKey}.description`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="scroll-mt-24 mx-auto max-w-6xl px-6 py-24 text-center sm:px-10">
        <h2 className="text-4xl font-bold sm:text-5xl">{t("finalCta.title")}</h2>
        <p className="mx-auto mt-4 max-w-md text-base text-ink-dim sm:text-lg">{t("finalCta.description")}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link href="/register" className="inline-flex min-h-14 items-center rounded-lg bg-brand px-7 text-base font-semibold text-on-brand transition hover:bg-brand-hover">{t("finalCta.ctaPrimary")}</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex min-h-14 items-center rounded-lg border border-white/15 px-7 text-base font-semibold text-ink-bright transition hover:bg-white/5">{t("finalCta.ctaSecondary")}</a>
        </div>
      </section>

      {/* Footer with menu columns */}
      <footer className="border-t border-white/10 px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <StratonMark className="h-8 w-8" id="logo-footer" />
              <p className={`${styles.heading} text-xl font-bold tracking-tight text-white`}>STRATON</p>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-dim">{t("footer.tagline")}</p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{t("footer.productHeading")}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-dim">
              <li><a href="#funcionalidades" className="hover:text-white">{t("nav.features")}</a></li>
              <li><a href="#georreferenciamento" className="hover:text-white">{t("nav.geolocation")}</a></li>
              <li><a href="#painel" className="hover:text-white">{t("nav.dashboard")}</a></li>
              <li><a href="#cadeia" className="hover:text-white">{t("nav.chain")}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{t("footer.companyHeading")}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-dim">
              <li><a href="#" className="hover:text-white">{t("footer.footerAbout")}</a></li>
              <li><a href="#" className="hover:text-white">{t("footer.footerBlog")}</a></li>
              <li><a href="#" className="hover:text-white">{t("footer.footerCareers")}</a></li>
              <li><a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white">{t("footer.footerContact")}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ink-faint">{t("footer.legalHeading")}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-dim">
              <li><a href="#" className="hover:text-white">{t("footer.footerPrivacy")}</a></li>
              <li><a href="#" className="hover:text-white">{t("footer.footerTerms")}</a></li>
              <li><a href="#" className="hover:text-white">{t("footer.footerSecurity")}</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-14 flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-ink-faint">{t("footer.copyright", { year: currentYear })}</p>
          <p className="text-xs text-ink-faint">
            {routing.locales.map((loc, index) => (
              <span key={loc}>
                {index > 0 && " · "}
                <a href={loc === routing.defaultLocale ? "/" : `/${loc}`} className="hover:text-white">{loc.toUpperCase()}</a>
              </span>
            ))}
          </p>
        </div>
      </footer>
    </div>
  );
}

type IconProps = { className?: string };

function StratonMark({ className, id = "logo" }: IconProps & { id?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22C55E" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16A34A" />
          <stop offset="1" stopColor="#14532D" />
        </linearGradient>
      </defs>
      <path d="M22 5L36 13L22 21L8 13Z" fill={`url(#${id}-a)`} />
      <path d="M8 13L22 21L22 30L8 22Z" fill={`url(#${id}-c)`} />
      <path d="M22 21L22 30L36 22L36 13Z" fill={`url(#${id}-b)`} />
      <path d="M8 22L22 30L22 39L8 31Z" fill={`url(#${id}-b)`} />
      <path d="M22 30L36 22L36 31L22 39Z" fill={`url(#${id}-c)`} />
    </svg>
  );
}

function PinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function BriefcaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CloudIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.3 8.02 4 4 0 0 1 17 18H7Z" />
    </svg>
  );
}

function TrendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m3 17 5-5 4 4 8-9" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </svg>
  );
}

function PhoneMock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="h-72 w-40 rounded-[2rem] border-4 border-white/10 bg-surface-deep p-3 shadow-2xl shadow-black/40">
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20" />
        <div className="h-full rounded-xl bg-white/[0.02] p-2">{children}</div>
      </div>
      <p className="text-sm text-ink-dim">{label}</p>
    </div>
  );
}
