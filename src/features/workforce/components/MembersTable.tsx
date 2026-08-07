"use client";
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

/**
 * The row actions are still inert — none of them do anything yet. They are
 * translated anyway, because a half-English menu reads as broken while a
 * translated one reads as unfinished, and the second is the truth.
 */
const ROW_ACTIONS = ["viewProfile", "editMembership", "changeRole", "assignTeam", "suspend", "remove"] as const;

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
            <p className="font-semibold text-[#E5E7EB]">{member.name}</p>
            <p className="text-xs text-[#9CA3AF]">{member.email}</p>
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
      cell: (member) => (
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center font-semibold text-[#22C55E] focus-visible:outline-2 focus-visible:outline-[#22C55E]">
            {t("manage")}
          </summary>
          <div className="absolute right-0 z-20 w-44 rounded-xl border border-white/10 bg-[#161A34] p-2 shadow-xl">
            {ROW_ACTIONS.map((action) => {
              const label = t(`action_${action}` as "action_remove");
              return (
                <button
                  key={action}
                  type="button"
                  aria-label={t("actionFor", { action: label, name: member.name })}
                  className="min-h-11 w-full rounded-lg px-3 text-left text-sm text-[#D1D5DB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
                >
                  {label}
                </button>
              );
            })}
          </div>
        </details>
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
        <h2 id="members-heading" className="text-xl font-semibold text-[#E5E7EB]">
          {t("membersHeading")}
        </h2>
        <p className="mt-1 text-sm text-[#9CA3AF]" aria-live="polite">
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
