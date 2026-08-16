"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/src/components/ui";
import { ConfirmationDialog, Modal } from "@/src/components/feedback";
import { Select } from "@/src/components/forms";
import { addTeamMemberAction, removeTeamMemberAction } from "../actions";
import type { AvailableMember, TeamMember, TeamMessageKey } from "../types";

export function TeamMembersManager({
  teamId,
  members,
  available,
  canManage,
}: {
  teamId: string;
  members: TeamMember[];
  available: AvailableMember[];
  canManage: boolean;
}) {
  const t = useTranslations("teams");
  // Dates were formatted with a hardcoded "en-BE" — Belgian *English*, whatever
  // language the person had chosen. The formatter follows the active locale.
  const format = useFormatter();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(available[0]?.membershipId ?? "");
  const [remove, setRemove] = useState<TeamMember | null>(null);
  const [messageKey, setMessageKey] = useState<TeamMessageKey | null>(null);
  const [pending, start] = useTransition();

  function add() {
    if (!selected) return;
    start(async () => {
      const result = await addTeamMemberAction(teamId, selected, "member");
      setMessageKey(result.messageKey);
      if (result.ok) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function confirmRemove() {
    if (!remove) return;
    start(async () => {
      const result = await removeTeamMemberAction(teamId, remove.id);
      setMessageKey(result.messageKey);
      if (result.ok) {
        setRemove(null);
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-2xl border border-edge-10 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t("membersTitle")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("membersSubtitle")}</p>
        </div>
        {canManage ? (
          <Button variant="outline" onClick={() => setOpen(true)} disabled={!available.length}>
            {t("addMember")}
          </Button>
        ) : null}
      </div>

      {messageKey ? (
        <p aria-live="polite" className="mt-4 text-sm text-ink-soft">
          {t(`message_${messageKey}` as "message_failed")}
        </p>
      ) : null}

      {members.length ? (
        <ul className="mt-5 divide-y divide-edge-10">
          {members.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand-bright">
                {member.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-ink-muted">
                  {member.jobTitle} · {t(`teamRole_${member.role}` as "teamRole_member")}
                </p>
              </div>
              <time className="text-xs text-ink-muted">
                {t("joined")} {format.dateTime(new Date(member.joinedAt), { dateStyle: "medium" })}
              </time>
              {canManage ? (
                <Button variant="ghost" onClick={() => setRemove(member)} disabled={member.role === "leader"}>
                  {t("remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-edge-15 p-6 text-center text-sm text-ink-muted">
          {t("noMembers")}
        </p>
      )}

      <Modal open={open} title={t("addTeamMember")} onClose={() => setOpen(false)}>
        <div className="space-y-5">
          <Select
            label={t("availableMember")}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            options={available.map((member) => ({ value: member.membershipId, label: `${member.name} — ${member.jobTitle}` }))}
          />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button loading={pending} onClick={add}>
              {t("addMember")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        open={Boolean(remove)}
        title={t("removeTitle")}
        description={t("removeDescription")}
        confirmLabel={t("removeConfirm")}
        onConfirm={confirmRemove}
        onClose={() => setRemove(null)}
      />
    </section>
  );
}
