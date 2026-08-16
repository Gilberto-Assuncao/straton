"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { respondToInvitationAction } from "@/src/features/sites/actions";
import type { IncomingInvitation } from "@/src/features/sites/partners";

/**
 * Invitations waiting on this company's answer.
 *
 * Sits on the sites list because accepting is what makes the other company's
 * sites appear there — the answer and its consequence are in the same place.
 */
export default function IncomingInvitations({ invitations }: { invitations: IncomingInvitation[] }) {
  const t = useTranslations("sites");
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  const open = invitations.filter((invitation) => !answered[invitation.id]);
  if (open.length === 0) return null;

  function respond(invitationId: string, accept: boolean) {
    startTransition(async () => {
      const result = await respondToInvitationAction(invitationId, accept);
      if (result.ok) setAnswered((current) => ({ ...current, [invitationId]: true }));
    });
  }

  return (
    <section aria-label={t("invitationsTitle")} className="mb-6 rounded-2xl border border-[#22C55E]/30 bg-[#161A34] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("invitationsTitle")}</h2>
      <p className="mt-1 text-sm text-[#9CA3AF]">{t("invitationsSubtitle")}</p>
      <ul className="mt-5 divide-y divide-white/10">
        {open.map((invitation) => (
          <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#E5E7EB]">
                {t("invitationFrom", { company: invitation.ownerCompanyName, project: invitation.siteName })}
              </p>
              {invitation.note ? <p className="mt-1 text-xs text-[#6B7280]">{invitation.note}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => respond(invitation.id, true)}
                disabled={pending}
                className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
              >
                {t("invitationAccept")}
              </button>
              <button
                type="button"
                onClick={() => respond(invitation.id, false)}
                disabled={pending}
                className="min-h-11 rounded-lg border border-white/15 px-4 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
              >
                {t("invitationDecline")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
