"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui";
import { Modal } from "@/src/components/feedback";
import { AddMemberForm } from "./AddMemberForm";
import { MembersTable } from "./MembersTable";
import { TeamsOverview } from "./TeamsOverview";
import { WorkforceStats } from "./WorkforceStats";
import type { WorkforceMemberView, WorkforceTeamView } from "../types";

export function WorkforceOverview({ members, teams }: { members: WorkforceMemberView[]; teams: WorkforceTeamView[] }) {
  const t = useTranslations("workforce");
  const [adding, setAdding] = useState(false);

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#22C55E]">{t("eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#E5E7EB] sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9CA3AF]">{t("description")}</p>
        </div>
        <Button onClick={() => setAdding(true)}>{t("addMember")}</Button>
      </header>

      <WorkforceStats members={members} teams={teams} />
      <MembersTable members={members} teams={teams} />
      <TeamsOverview teams={teams} />

      <Modal open={adding} title={t("addMember")} onClose={() => setAdding(false)}>
        <AddMemberForm teams={teams} onClose={() => setAdding(false)} />
      </Modal>
    </div>
  );
}
