"use client";
import { useTranslations } from "next-intl";
import { MetricCard } from "@/src/components/data-display";
import type { WorkforceMemberView, WorkforceTeamView } from "../types";

/**
 * Marked "use client" explicitly even though it holds no state.
 *
 * It is only ever rendered from WorkforceOverview, which is a client
 * component — so it was already in the client bundle by inheritance. Saying so
 * out loud is what makes `useTranslations` correct here rather than
 * `getTranslations`, and stops the next person reaching for the server API and
 * getting a build error they have to reverse-engineer.
 */
export function WorkforceStats({ members, teams }: { members: WorkforceMemberView[]; teams: WorkforceTeamView[] }) {
  const t = useTranslations("workforce");
  const active = members.filter((member) => member.membershipStatus === "active").length;
  const invited = members.filter((member) => member.membershipStatus === "invited").length;

  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={t("statTotal")} value={members.length} detail={t("statTotalDetail")} />
      <MetricCard label={t("statActive")} value={active} detail={t("statActiveDetail")} />
      <MetricCard label={t("statTeams")} value={teams.length} detail={t("statTeamsDetail")} />
      <MetricCard label={t("statInvites")} value={invited} detail={t("statInvitesDetail")} />
    </dl>
  );
}
