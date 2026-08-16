"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui";
import { ConfirmationDialog } from "@/src/components/feedback";
import { archiveTeamAction } from "../actions";
import type { TeamMessageKey, TeamStatus } from "../types";

export function TeamDangerZone({ teamId, status, canArchive }: { teamId: string; status: TeamStatus; canArchive: boolean }) {
  const t = useTranslations("teams");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [messageKey, setMessageKey] = useState<TeamMessageKey | null>(null);

  if (!canArchive) return null;
  const archived = status === "archived";

  function confirm() {
    start(async () => {
      const result = await archiveTeamAction(teamId, !archived);
      setMessageKey(result.messageKey);
      setOpen(false);
      if (result.ok) router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-red-400/30 bg-red-400/5 p-5">
      <h2 className="text-lg font-semibold text-red-100">{t("dangerTitle")}</h2>
      <p className="mt-2 text-sm text-ink-soft">{archived ? t("dangerReactivateBody") : t("dangerArchiveBody")}</p>

      <Button className="mt-4" variant={archived ? "outline" : "danger"} loading={pending} onClick={() => setOpen(true)}>
        {archived ? t("reactivateTeam") : t("archiveTeam")}
      </Button>

      {messageKey ? (
        <p aria-live="polite" className="mt-3 text-sm">
          {/* The action returned an outcome; the sentence is chosen here, where
              the locale is actually known. */}
          {t(`message_${messageKey}` as "message_failed")}
        </p>
      ) : null}

      <ConfirmationDialog
        open={open}
        title={archived ? t("reactivateConfirmTitle") : t("archiveConfirmTitle")}
        description={archived ? t("reactivateConfirmBody") : t("archiveConfirmBody")}
        confirmLabel={archived ? t("reactivate") : t("archiveTeam")}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
