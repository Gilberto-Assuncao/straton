"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/src/components/data-display";
import { Select } from "@/src/components/forms";
import { DataTable, type DataColumn } from "@/src/components/tables";
import type { WorkforceMembershipStatus } from "@/src/domain";
import type { WorkforceMemberView, WorkforceTeamView } from "../types";
import { MemberStatusBadge, RoleBadge } from "./WorkforceBadges";

/**
 * Every value of the `membership_status` enum, checked against the database
 * rather than copied from the old list — which was missing `ended`, so nobody
 * in that state could be filtered for and the badge printed the raw
 * identifier. tests/rls/enum-labels.test.ts keeps the two in step.
 */
const MEMBERSHIP_STATUSES = ["invited", "active", "suspended", "ended", "inactive", "left", "rejected"] as const;


export function MembersTable({ members, teams }: { members: WorkforceMemberView[]; teams: WorkforceTeamView[] }) {
  const t = useTranslations("workforce");
  const [status, setStatus] = useState<"all" | WorkforceMembershipStatus>("all");
  const [team, setTeam] = useState("all");

  const filtered = useMemo(
    () =>
      members.filter(
        (member) =>
          (status === "all" || member.membershipStatus === status) && (team === "all" || member.team === team),
      ),
    [members, status, team],
  );

  const columns: DataColumn<WorkforceMemberView>[] = [
    {
      id: "person",
      header: t("colPerson"),
      sortValue: (member) => member.name,
      hideable: false,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <Avatar name={member.name} />
          <div>
            <p className="font-semibold text-ink">{member.name}</p>
            <p className="text-xs text-ink-muted">{member.email}</p>
          </div>
        </div>
      ),
    },
    { id: "role", header: t("colRole"), sortValue: (member) => member.role, cell: (member) => <RoleBadge role={member.role} /> },
    { id: "company", header: t("colCompany"), cell: (member) => member.company },
    { id: "team", header: t("colTeam"), sortValue: (member) => member.team, cell: (member) => member.team },
    {
      id: "type",
      header: t("colEmployment"),
      sortValue: (member) => member.employmentType,
      // Was `capitalize` on a raw identifier with underscores swapped for
      // spaces — which is English formatting applied to an English value.
      cell: (member) => <span>{t(`type_${member.employmentType}` as "type_employee")}</span>,
    },
    {
      id: "status",
      header: t("colStatus"),
      sortValue: (member) => member.membershipStatus,
      cell: (member) => <MemberStatusBadge status={member.membershipStatus} />,
    },
    { id: "joined", header: t("colJoined"), sortValue: (member) => member.joinedAt, cell: (member) => member.joinedAt },
    {
      id: "actions",
      header: t("colActions"),
      hideable: false,
      /*
       * One link, where there were six buttons with no `onClick` (#45).
       *
       * Every one of them already has a real home on the person's own page:
       * the profile, the membership edit, and suspend all live there, and
       * team assignment lives on Teams. A menu of six dead options is not a
       * feature waiting to be finished — it is six chances to believe
       * something happened.
       */
      cell: (member) => (
        <Link
          href={`/dashboard/employees/${member.id}`}
          className="flex min-h-11 items-center font-semibold text-brand-bright hover:text-brand-bright focus-visible:outline-2 focus-visible:outline-brand-bright"
          aria-label={t("openProfileFor", { name: member.name })}
        >
          {t("openProfile")}
        </Link>
      ),
    },
  ];

  const filters = (
    <div className="grid gap-3 sm:grid-cols-2">
      <Select
        id="workforce-status-filter"
        label={t("filterStatus")}
        value={status}
        onChange={(event) => setStatus(event.target.value as typeof status)}
        options={[
          { value: "all", label: t("filterAllStatuses") },
          ...MEMBERSHIP_STATUSES.map((value) => ({ value, label: t(`status_${value}` as "status_active") })),
        ]}
      />
      <Select
        id="workforce-team-filter"
        label={t("filterTeam")}
        value={team}
        onChange={(event) => setTeam(event.target.value)}
        options={[{ value: "all", label: t("filterAllTeams") }, ...teams.map((item) => ({ value: item.name, label: item.name }))]}
      />
    </div>
  );

  return (
    <section aria-labelledby="members-heading">
      <div className="mb-4">
        <h2 id="members-heading" className="text-xl font-semibold text-ink">
          {t("membersHeading")}
        </h2>
        <p className="mt-1 text-sm text-ink-muted" aria-live="polite">
          {t("membersShowing", { shown: filtered.length, total: members.length })}
        </p>
      </div>
      <DataTable
        rows={filtered}
        columns={columns}
        rowId={(member) => member.id}
        searchableText={(member) => `${member.name} ${member.email} ${member.role} ${member.team}`}
        filters={filters}
        emptyTitle={t("membersEmpty")}
      />
    </section>
  );
}
