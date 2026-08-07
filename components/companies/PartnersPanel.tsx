"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  acceptPartnershipAction,
  rejectPartnershipAction,
  requestPartnershipAction,
  searchCompanyDirectoryAction,
} from "@/src/features/partners/actions";
import type { CompanyDirectoryEntry, PartnerRelationship, RelationshipType } from "@/src/features/partners/data";

const RELATIONSHIP_TYPES: RelationshipType[] = ["client", "contractor", "subcontractor", "partner"];

const statusStyles: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300",
  active: "bg-[#22C55E]/10 text-[#4ADE80]",
  rejected: "bg-red-400/10 text-red-300",
};

export default function PartnersPanel({ relationships }: { relationships: PartnerRelationship[] }) {
  const t = useTranslations("companies");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompanyDirectoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("subcontractor");

  async function runSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setResults(await searchCompanyDirectoryAction(value));
    setSearching(false);
  }

  function request(companyId: string) {
    startTransition(async () => {
      const result = await requestPartnershipAction(companyId, relationshipType);
      // These actions still return English sentences. Converting them is the
      // same job done for teams and companies — tracked in #28.
      setFeedback(result.message);
      if (result.ok) {
        setQuery("");
        setResults([]);
      }
    });
  }

  function respond(relationshipId: string, accept: boolean) {
    startTransition(async () => {
      const result = accept ? await acceptPartnershipAction(relationshipId) : await rejectPartnershipAction(relationshipId);
      setFeedback(result.message);
    });
  }

  const typeLabel = (type: RelationshipType) => t(`type_${type}` as "type_partner");

  const incomingPending = relationships.filter((r) => r.direction === "incoming" && r.status === "pending");
  const others = relationships.filter((r) => !(r.direction === "incoming" && r.status === "pending"));

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-[#E5E7EB]">{t("partnersTitle")}</h3>
        <p className="mt-1 text-sm text-[#9CA3AF]">{t("partnersSubtitle")}</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(event) => runSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-h-11 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-sm text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"
          />
          {query.trim().length >= 2 ? (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[#111827] p-1 shadow-xl">
              {searching ? <p className="px-3 py-2 text-sm text-[#6B7280]">{t("searching")}</p> : null}
              {!searching && results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[#6B7280]">{t("noCompaniesFound")}</p>
              ) : null}
              {results.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  disabled={pending}
                  onClick={() => request(company.id)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-[#E5E7EB] hover:bg-white/5 disabled:opacity-60"
                >
                  <span>{company.name}</span>
                  <span className="text-xs text-[#4ADE80]">{t("inviteAs", { type: typeLabel(relationshipType) })}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <select
          value={relationshipType}
          onChange={(event) => setRelationshipType(event.target.value as RelationshipType)}
          className="min-h-11 rounded-lg border border-white/10 bg-[#111827] px-3 text-sm text-[#E5E7EB]"
        >
          {RELATIONSHIP_TYPES.map((type) => (
            <option key={type} value={type}>
              {typeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      {feedback ? (
        <p role="status" className="mt-4 text-sm text-[#9CA3AF]">
          {feedback}
        </p>
      ) : null}

      {incomingPending.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">{t("awaitingResponse")}</p>
          <ul className="mt-3 space-y-2">
            {incomingPending.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
                <div>
                  <p className="font-medium text-[#E5E7EB]">{r.companyName}</p>
                  <p className="text-xs text-[#9CA3AF]">{t("wantsToBe", { type: typeLabel(r.relationshipType) })}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => respond(r.id, true)}
                    className="min-h-11 rounded-lg bg-[#22C55E] px-3 text-xs font-semibold text-[#07110B]"
                  >
                    {t("accept")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => respond(r.id, false)}
                    className="min-h-11 rounded-lg border border-red-400/30 px-3 text-xs font-semibold text-red-300"
                  >
                    {t("reject")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">{t("relationships")}</p>
        {others.length === 0 ? (
          <p className="mt-3 text-sm text-[#6B7280]">{t("noPartnersYet")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {others.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-4 py-3">
                <div>
                  <p className="font-medium text-[#E5E7EB]">{r.companyName}</p>
                  <p className="text-xs text-[#9CA3AF]">
                    {typeLabel(r.relationshipType)} · {r.direction === "outgoing" ? t("youInvited") : t("invitedYou")}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[r.status]}`}>
                  {t(`rel_${r.status}` as "rel_active")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
