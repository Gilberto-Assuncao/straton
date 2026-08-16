"use client";
import { useTranslations } from "next-intl";
import { EntityCard } from "@/src/components/cards";
import { Badge } from "@/src/components/data-display";
import { Button } from "@/src/components/ui";
import type { WorkforceTeamView } from "../types";

export function TeamsOverview({ teams }: { teams: WorkforceTeamView[] }) {
  const t = useTranslations("workforce");

  return (
    <section aria-labelledby="teams-heading">
      <div className="mb-4">
        <h2 id="teams-heading" className="text-xl font-semibold text-ink">
          {t("teamsHeading")}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t("teamsSubtitle")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teams.map((team) => (
          <EntityCard
            key={team.id}
            title={team.name}
            subtitle={team.description}
            status={team.status}
            metadata={
              <dl className="grid gap-2">
                <div>
                  <dt className="text-xs text-ink-muted">{t("teamLeader")}</dt>
                  <dd>{team.leader}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">{t("teamMembers")}</dt>
                  <dd>{team.memberCount}</dd>
                </div>
              </dl>
            }
            action={
              <Button variant="outline" className="w-full">
                {t("viewTeam")}
              </Button>
            }
          >
            {team.currentUserRole ? (
              // The role comes from the database as an English identifier, so it
              // goes through the same translation table as the badges.
              <Badge>{t("myRole", { role: t(`role_${team.currentUserRole}` as "role_owner") })}</Badge>
            ) : null}
          </EntityCard>
        ))}
      </div>
    </section>
  );
}
