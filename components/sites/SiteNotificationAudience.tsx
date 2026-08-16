"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { subscribeToSiteAction, unsubscribeFromSiteAction } from "@/src/features/sites/actions";
import type { SiteAudience } from "@/src/features/sites/notifications";

const card = "rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6";
const field =
  "min-h-11 w-full rounded-lg border border-white/15 bg-[#111C33] px-3 text-sm text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]";
const secondaryButton =
  "min-h-11 rounded-lg border border-white/15 px-4 text-xs font-semibold text-[#E5E7EB] hover:bg-white/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#22C55E]";

/**
 * Quem é avisado quando este local muda (#83).
 *
 * O ecrã tem duas metades e elas são deliberadamente desiguais. A de cima
 * mostra nomes — são colegas da própria empresa. A de baixo mostra empresas e
 * contagens, nunca nomes, porque numa obra o empreiteiro geral não tem de ver
 * o pessoal do subcontratado, e um ecrã que oferecesse "escolha quem da
 * GeoTech recebe" teria divulgado essa lista antes da primeira notificação.
 *
 * A desigualdade está dita por escrito no ecrã, e não apenas obedecida. Uma
 * secção que mostra "3 pessoas" sem explicar porquê parece uma funcionalidade
 * por acabar, e alguém acabaria por a "corrigir".
 */
export default function SiteNotificationAudience({
  siteId,
  audience,
}: {
  siteId: string;
  audience: SiteAudience;
}) {
  const t = useTranslations("sites");
  const [userId, setUserId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message: string }>, onOk?: () => void) {
    startTransition(async () => {
      const result = await action();
      setFeedback(result);
      if (result.ok) onOk?.();
    });
  }

  return (
    <div className="grid gap-5">
      <div className={card}>
        <h2 className="text-lg font-semibold text-[#E5E7EB]">{t("audienceTitle")}</h2>
        <p className="mt-1 text-sm text-[#9CA3AF]">{t("audienceSubtitle")}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs text-[#9CA3AF]">{t("audiencePersonLabel")}</span>
            <select
              id="audience-person"
              className={field}
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">{t("audiencePersonPlaceholder")}</option>
              {audience.candidates.map((person) => (
                <option key={person.userId} value={person.userId}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs text-[#9CA3AF]">{t("audienceScopeLabel")}</span>
            {/*
              O local inteiro é a primeira opção e o valor por omissão, porque
              é o que foi pedido: "todos os envolvidos naquele local". Limitar
              a um setor é o caso especial, e um ecrã que obrigasse a escolher
              um faria da excepção a regra.
            */}
            <select
              id="audience-scope"
              className={field}
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
            >
              <option value="">{t("audienceScopeWholeSite")}</option>
              {audience.areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.isDefault ? t("areaWholeLocation") : area.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              run(() => subscribeToSiteAction(siteId, userId, areaId), () => {
                setUserId("");
                setAreaId("");
              })
            }
            disabled={pending || !userId}
            className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
          >
            {t("audienceAdd")}
          </button>
        </div>

        {feedback ? (
          <p role="status" className={`mt-4 text-sm ${feedback.ok ? "text-[#4ADE80]" : "text-red-300"}`}>
            {feedback.message}
          </p>
        ) : null}
      </div>

      <div className={card}>
        <h3 className="text-sm font-semibold text-[#E5E7EB]">{t("audienceMineTitle")}</h3>
        {audience.subscribers.length === 0 ? (
          <p className="mt-4 text-sm text-[#9CA3AF]">{t("audienceMineEmpty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10">
            {audience.subscribers.map((subscriber) => (
              <li
                key={subscriber.id}
                data-subscriber-id={subscriber.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#E5E7EB]">{subscriber.name}</p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    {subscriber.areaId ? subscriber.areaName : t("audienceScopeWholeSite")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => run(() => unsubscribeFromSiteAction(siteId, subscriber.id))}
                  disabled={pending}
                  className={secondaryButton}
                >
                  {t("audienceRemove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {audience.companies.length > 0 ? (
        <div className={card}>
          <h3 className="text-sm font-semibold text-[#E5E7EB]">{t("audienceCompaniesTitle")}</h3>
          {/*
            Dito, não apenas obedecido. Sem esta frase a secção parece uma
            lista por carregar, e a próxima pessoa a passar por aqui "arranja"
            precisamente a coisa que não pode ser arranjada.
          */}
          <p className="mt-1 text-sm text-[#9CA3AF]">{t("audienceCompaniesSubtitle")}</p>
          <ul className="mt-4 divide-y divide-white/10">
            {audience.companies.map((company) => (
              <li key={company.companyId} className="flex items-center justify-between gap-3 py-3">
                <p className="text-sm text-[#E5E7EB]">{company.companyName}</p>
                <span className="text-xs text-[#9CA3AF]">
                  {t("audienceCompanyCount", { count: company.subscriberCount })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
