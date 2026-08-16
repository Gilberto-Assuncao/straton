"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { SiteMessageKey } from "@/src/features/sites/messages";
import {
  createClientCompanyAction,
  searchClientSuggestionsAction,
  type CompanySuggestion,
} from "@/src/features/sites/actions";
import type { ClientOption } from "@/src/features/sites/types";

const field = "mt-2 min-h-12 w-full rounded-lg border border-edge-10 bg-surface-alt px-4 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "text-sm font-medium text-ink";

/**
 * Picks the client for a site, and lets one be created without leaving the
 * form — abandoning a half-filled site to go and register a company was the
 * whole complaint behind #32.
 *
 * New clients are searched in the Belgian register by name, since that is what
 * the person filling this in actually knows.
 */
export default function ClientPicker({ clients, defaultValue }: { clients: ClientOption[]; defaultValue?: string | null }) {
  const t = useTranslations("sites");
  const [options, setOptions] = useState(clients);
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CompanySuggestion[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<SiteMessageKey | null>(null);

  function search() {
    if (query.trim().length < 3) return;
    setError(null);
    startTransition(async () => {
      setSuggestions(await searchClientSuggestionsAction(query));
    });
  }

  function add(input: { displayName: string; registrationNumber?: string; city?: string; postalCode?: string }) {
    setError(null);
    startTransition(async () => {
      const result = await createClientCompanyAction(input);
      if (!result.ok) {
        setError(result.messageKey);
        return;
      }
      // Appended and selected straight away, so the form can be submitted
      // without a round trip to reload the list.
      setOptions((current) => [...current, { id: result.id, name: result.name, city: input.city ?? null }].sort((a, b) => a.name.localeCompare(b.name)));
      setSelected(result.id);
      setCreating(false);
      setSuggestions(null);
      setQuery("");
    });
  }

  return (
    <div className="sm:col-span-2">
      <label htmlFor="site-client" className={label}>{t("clientLabel")}</label>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <select id="site-client" name="clientCompanyId" value={selected} onChange={(event) => setSelected(event.target.value)} className={field}>
            <option value="">{t("noClient")}</option>
            {options.map((client) => (
              <option key={client.id} value={client.id}>{client.name}{client.city ? ` — ${client.city}` : ""}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setCreating((current) => !current)}
          className="mt-2 min-h-12 shrink-0 rounded-lg border border-edge-15 px-4 text-sm font-semibold text-ink transition hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {creating ? t("cancel") : t("newClient")}
        </button>
      </div>

      {creating ? (
        <div className="mt-4 rounded-xl border border-edge-10 bg-surface-inset p-4">
          <p className="text-sm font-semibold text-ink">{t("newClientTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">{t("newClientHelp")}</p>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="client-search" className={label}>{t("clientNameLabel")}</label>
              <input
                id="client-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); search(); } }}
                placeholder={t("clientNamePlaceholder")}
                className={field}
              />
            </div>
            <button type="button" onClick={search} disabled={pending || query.trim().length < 3} className="mt-2 min-h-12 shrink-0 rounded-lg border border-brand/40 bg-brand/10 px-4 text-sm font-semibold text-brand-bright transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? t("clientSearching") : t("clientSearch")}
            </button>
          </div>

          {suggestions?.length ? (
            <ul className="mt-4 grid gap-2">
              {suggestions.map((hit) => (
                <li key={hit.enterpriseNumber}>
                  <button
                    type="button"
                    onClick={() => add({ displayName: hit.name, registrationNumber: hit.enterpriseNumber, city: hit.city, postalCode: hit.postalCode })}
                    disabled={pending}
                    className="flex w-full min-h-12 items-center justify-between gap-3 rounded-lg bg-canvas px-4 py-3 text-left transition hover:bg-edge-5 disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{hit.name}</span>
                      <span className="mt-0.5 block font-mono text-xs text-ink-subtle">{hit.enterpriseNumber}{hit.city ? ` · ${hit.city}` : ""}</span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-sm font-semibold text-brand-bright">+</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {suggestions?.length === 0 ? (
            <div className="mt-4 rounded-lg bg-canvas p-4">
              <p className="text-xs leading-5 text-ink-muted">{t("clientNoResults")}</p>
              <button type="button" onClick={() => add({ displayName: query })} disabled={pending} className="mt-3 min-h-11 rounded-lg border border-edge-15 px-4 text-sm font-semibold text-ink hover:bg-edge-5 disabled:opacity-50">
                {t("clientAddManually", { name: query })}
              </button>
            </div>
          ) : null}

          {error ? <p role="alert" className="mt-4 rounded-lg bg-red-400/10 p-3 text-xs text-red-300">{t(error)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
