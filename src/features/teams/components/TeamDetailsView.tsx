"use client";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { DashboardCard, KpiCard } from "@/src/components/dashboard";
import { TeamStatusBadge } from "./TeamStatusBadge";
import { TeamMembersManager } from "./TeamMembersManager";
import { TeamDangerZone } from "./TeamDangerZone";
import type { TeamDetails } from "../types";

export function TeamDetailsView({ team }: { team: TeamDetails }) {
  const t = useTranslations("teams");
  const format = useFormatter();
  const canManage = team.permissions.includes("manage");
  const supervisors = team.members.filter((member) => member.role === "supervisor").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#22C55E]">{t("detailsEyebrow", { company: team.companyName })}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{team.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#9CA3AF]">{team.description || t("noDescriptionProvided")}</p>
        </div>
        <div className="flex items-center gap-3">
          <TeamStatusBadge status={team.status} />
          {canManage ? (
            <Link
              href={`/dashboard/teams/${team.id}/edit`}
              className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 font-semibold"
            >
              {t("editTeam")}
            </Link>
          ) : null}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t("members")} value={team.members.length} />
        <KpiCard title={t("leader")} value={team.leaderName ?? t("unassigned")} />
        <KpiCard title={t("kpiSupervisors")} value={supervisors} />
        {/* `capitalize` dropped along with the raw value — see TeamStatusBadge. */}
        <KpiCard title={t("fieldStatus")} value={t(`status_${team.status}` as "status_active")} />
      </section>

      <DashboardCard title={t("overview")}>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-[#9CA3AF]">{t("company")}</dt>
            <dd>{team.companyName}</dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">{t("created")}</dt>
            <dd>{format.dateTime(new Date(team.createdAt), { dateStyle: "medium" })}</dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">{t("updatedLabel")}</dt>
            <dd>{format.dateTime(new Date(team.updatedAt), { dateStyle: "medium" })}</dd>
          </div>
          <div>
            <dt className="text-[#9CA3AF]">{t("color")}</dt>
            <dd>
              <span className="mr-2 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
              {team.color}
            </dd>
          </div>
        </dl>
      </DashboardCard>

      <TeamMembersManager
        teamId={team.id}
        members={team.members}
        available={team.availableMembers}
        canManage={canManage && team.status !== "archived"}
      />
      <TeamDangerZone teamId={team.id} status={team.status} canArchive={team.permissions.includes("archive")} />
    </div>
  );
}
