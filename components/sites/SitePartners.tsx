"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { SiteMessageKey } from "@/src/features/sites/messages";
import { invitePartnerAction, revokePartnerAction } from "@/src/features/sites/actions";
import type { SitePartner } from "@/src/features/sites/partners";

const card = "rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6";
const field =
  "min-h-11 w-full rounded-lg border border-edge-15 bg-surface-inset px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand";

const statusTone: Record<SitePartner["status"], string> = {
  invited: "bg-amber-400/10 text-amber-300",
  accepted: "bg-brand/10 text-brand-bright",
  declined: "bg-edge-10 text-ink-muted",
  revoked: "bg-edge-10 text-ink-muted",
};

export default function SitePartners({
  siteId,
  partners,
  invitable,
}: {
  siteId: string;
  partners: SitePartner[];
  invitable: { id: string; name: string; city: string | null }[];
}) {
  const t = useTranslations("sites");
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; messageKey: SiteMessageKey } | null>(null);
  const [pending, startTransition] = useTransition();

  function invite() {
    startTransition(async () => {
      const result = await invitePartnerAction(siteId, selected, note);
      setFeedback(result);
      if (result.ok) {
        setSelected("");
        setNote("");
      }
    });
  }

  function revoke(invitationId: string) {
    startTransition(async () => setFeedback(await revokePartnerAction(siteId, invitationId)));
  }

  const active = partners.filter((partner) => partner.status === "invited" || partner.status === "accepted");
  const past = partners.filter((partner) => partner.status === "declined" || partner.status === "revoked");

  return (
    <div className="grid gap-5">
      <div className={card}>
        <h2 className="text-lg font-semibold text-ink">{t("partnersTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("partnersSubtitle")}</p>

        {/*
          No "link this to a project first" any more (#77). That amber box was
          the screen reporting a fact about the schema as though it were a fact
          about the chantier — and it was a dead end, because nothing on this
          page could create the project it was asking for.
        */}
        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs text-ink-muted">{t("partnerCompanyLabel")}</span>
            <select className={field} value={selected} onChange={(event) => setSelected(event.target.value)}>
              <option value="">{t("partnerChoose")}</option>
              {invitable.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.city ? `${company.name} — ${company.city}` : company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs text-ink-muted">{t("partnerNoteLabel")}</span>
            <input className={field} value={note} onChange={(event) => setNote(event.target.value)} maxLength={280} />
          </label>
          <button
            type="button"
            onClick={invite}
            disabled={pending || !selected}
            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
          >
            {pending ? t("partnerInviting") : t("partnerInvite")}
          </button>
        </div>

        {invitable.length === 0 ? (
          <p className="mt-3 text-xs text-ink-subtle">{t("partnersNoCandidates")}</p>
        ) : null}

        {feedback ? (
          <p role="status" className={`mt-4 text-sm ${feedback.ok ? "text-brand-bright" : "text-red-300"}`}>
            {t(feedback.messageKey)}
          </p>
        ) : null}
      </div>

      <div className={card}>
        <h3 className="text-sm font-semibold text-ink">{t("partnersOnSite")}</h3>
        {active.length === 0 ? (
          <p className="mt-4 text-sm text-ink-subtle">{t("partnersEmpty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-edge-10">
            {active.map((partner) => (
              <li key={partner.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{partner.companyName}</p>
                  <p className="mt-1 text-xs text-ink-subtle">
                    {[partner.city, partner.note, partner.invitedBy ? t("partnerInvitedBy", { name: partner.invitedBy }) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${statusTone[partner.status]}`}>
                    {t(`partnerStatus_${partner.status}` as "partnerStatus_invited")}
                  </span>
                  <button
                    type="button"
                    onClick={() => revoke(partner.id)}
                    disabled={pending}
                    className="min-h-11 rounded-lg border border-edge-15 px-4 text-xs font-semibold text-ink hover:bg-edge-5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
                  >
                    {t("partnerRemove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {past.length > 0 ? (
          <ul className="mt-5 border-t border-edge-10 pt-4 grid gap-2">
            {past.map((partner) => (
              <li key={partner.id} className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-subtle">
                <span>{partner.companyName}</span>
                <span>{t(`partnerStatus_${partner.status}` as "partnerStatus_invited")}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
