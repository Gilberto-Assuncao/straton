"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Input, Select } from "@/src/components/forms";
import { KpiCard } from "@/src/components/dashboard";
import { TeamStatusBadge } from "./TeamStatusBadge";
import type { TeamPermission, TeamSummary } from "../types";

export function TeamsOverview({ teams, permissions }: { teams: TeamSummary[]; permissions: TeamPermission[] }) {
  const t = useTranslations("teams");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("operational");

  const filtered = useMemo(
    () =>
      teams.filter(
        (team) =>
          (status === "all" || (status === "operational" ? team.status !== "archived" : team.status === status)) &&
          `${team.name} ${team.description}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [teams, search, status],
  );

  const active = teams.filter((team) => team.status === "active").length;
  const inactive = teams.filter((team) => team.status === "inactive").length;
  const archived = teams.filter((team) => team.status === "archived").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* Was "Sprint 3.9 · Teams" — an internal sprint number on a customer's
              screen, which no translation would have improved. */}
          <p className="text-sm font-semibold text-brand">{t("eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        {permissions.includes("manage") ? (
          <Link
            href="/dashboard/teams/new"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 font-semibold text-on-brand"
          >
            {t("createTeam")}
          </Link>
        ) : null}
      </header>

      <section aria-label={t("statTotal")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t("statTotal")} value={teams.length} />
        <KpiCard title={t("statActive")} value={active} />
        <KpiCard title={t("statInactive")} value={inactive} />
        <KpiCard title={t("statArchived")} value={archived} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Input label={t("searchLabel")} type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Select
          label={t("statusFilterLabel")}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: "operational", label: t("filter_operational") },
            { value: "all", label: t("filter_all") },
            { value: "active", label: t("status_active") },
            { value: "inactive", label: t("status_inactive") },
            { value: "archived", label: t("status_archived") },
          ]}
        />
      </section>

      {filtered.length ? (
        <section aria-label={t("title")} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((team) => (
            <article key={team.id} className="rounded-2xl border border-white/10 bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="h-10 w-2 rounded-full" style={{ backgroundColor: team.color }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{team.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{team.description || t("noDescription")}</p>
                </div>
                <TeamStatusBadge status={team.status} />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-ink-muted">{t("leader")}</dt>
                  <dd>{team.leaderName ?? t("unassigned")}</dd>
                </div>
                <div>
                  <dt className="text-ink-muted">{t("members")}</dt>
                  <dd>{team.memberCount}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-ink-muted">
                {t("updated", { date: format.dateTime(new Date(team.updatedAt), { dateStyle: "medium" }) })}
              </p>
              <Link href={`/dashboard/teams/${team.id}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand">
                {t("openDetails")}
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-white/15 bg-surface p-8 text-center">
          <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-2 text-sm text-ink-muted">{t("emptyBody")}</p>
        </section>
      )}
    </div>
  );
}
