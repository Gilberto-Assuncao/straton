"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { inviteNewCompanyAction, revokeCompanyInviteAction } from "@/src/features/partners/invite-actions";
import { searchClientSuggestionsAction, type CompanySuggestion } from "@/src/features/sites/actions";
import type { CompanyInvite } from "@/src/features/partners/invites";

const field =
  "min-h-11 w-full rounded-lg border border-white/15 bg-surface-inset px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand";
const labelText = "text-xs text-ink-muted";

export default function InviteNewCompany({ invites }: { invites: CompanyInvite[] }) {
  const t = useTranslations("companyInvites");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; key: string; link?: string } | null>(null);
  const [revoked, setRevoked] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  /**
   * Looked up in the Belgian register while they type.
   *
   * Not a nicety: the invitee's acceptance form is prefilled from what is
   * stored here, and a subcontractor who has to retype their own VAT number to
   * accept an invitation often simply does not.
   */
  function lookUp(value: string) {
    setName(value);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    startTransition(async () => setSuggestions(await searchClientSuggestionsAction(value)));
  }

  function choose(suggestion: CompanySuggestion) {
    setName(suggestion.name);
    setRegistrationNumber(suggestion.enterpriseNumber);
    setCity(suggestion.city);
    setPostalCode(suggestion.postalCode);
    setSuggestions([]);
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const response = await inviteNewCompanyAction(formData);
      setResult(response.ok ? { ok: true, key: response.message, link: response.link } : { ok: false, key: response.message });
      setCopied(false);
      if (response.ok) {
        setName("");
        setRegistrationNumber("");
        setCity("");
        setPostalCode("");
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const response = await revokeCompanyInviteAction(id);
      if (response.ok) setRevoked((current) => [...current, id]);
    });
  }

  const open = invites.filter((invite) => invite.status === "pending" && !revoked.includes(invite.id));

  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-5 sm:p-6">
      <h3 className="text-lg font-semibold text-ink">{t("title")}</h3>
      <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>

      <form action={submit} className="mt-5 grid gap-4">
        <div className="relative grid gap-1.5">
          <label className={labelText} htmlFor="invite-company-name">
            {t("companyNameLabel")}
          </label>
          <input
            id="invite-company-name"
            name="companyName"
            value={name}
            onChange={(event) => lookUp(event.target.value)}
            required
            minLength={2}
            className={field}
            autoComplete="off"
          />
          {suggestions.length > 0 ? (
            <ul className="absolute top-full z-10 mt-1 w-full rounded-lg border border-white/10 bg-surface-alt p-1 shadow-xl">
              {suggestions.map((suggestion) => (
                <li key={suggestion.enterpriseNumber}>
                  <button
                    type="button"
                    onClick={() => choose(suggestion)}
                    className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-white/5"
                  >
                    <span>{suggestion.name}</span>
                    <span className="text-xs text-ink-subtle">
                      {suggestion.enterpriseNumber} · {suggestion.postalCode} {suggestion.city}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelText}>{t("emailLabel")}</span>
            <input type="email" name="email" required className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelText}>{t("relationshipLabel")}</span>
            <select name="relationshipType" defaultValue="subcontractor" className={field}>
              {(["subcontractor", "contractor", "client", "partner"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`type_${type}` as "type_subcontractor")}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Filled by the register lookup, and left visible rather than hidden:
            the person inviting should be able to see, and correct, what the
            other company is about to have put in their mouth. */}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5">
            <span className={labelText}>{t("registrationLabel")}</span>
            <input
              name="registrationNumber"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(event.target.value)}
              className={field}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={labelText}>{t("postalCodeLabel")}</span>
            <input name="postalCode" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelText}>{t("cityLabel")}</span>
            <input name="city" value={city} onChange={(event) => setCity(event.target.value)} className={field} />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={labelText}>{t("noteLabel")}</span>
          <input name="note" maxLength={280} className={field} />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 justify-self-start rounded-lg bg-brand px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
        >
          {pending ? t("sending") : t("send")}
        </button>
      </form>

      {result ? (
        <div className="mt-4">
          <p role="status" className={`text-sm ${result.ok ? "text-brand-bright" : "text-red-300"}`}>
            {t(`message_${result.key}` as "message_sent")}
          </p>
          {result.link ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-surface-inset p-3">
              <p className="text-xs text-ink-muted">{t("linkHint")}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-black/30 px-2 py-1 text-xs text-ink-soft">
                  {result.link}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(result.link ?? "");
                    setCopied(true);
                  }}
                  className="min-h-11 rounded-lg border border-white/15 px-4 text-xs font-semibold text-ink hover:bg-white/5"
                >
                  {copied ? t("copied") : t("copy")}
                </button>
              </div>
              {/* Said once, plainly: this link is the credential. */}
              <p className="mt-2 text-xs text-amber-300/80">{t("linkWarning")}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {open.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">{t("pendingTitle")}</p>
          <ul className="mt-3 space-y-2">
            {open.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{invite.companyName}</p>
                  <p className="text-xs text-ink-muted">
                    {invite.invitedEmail} · {t(`type_${invite.relationshipType}` as "type_subcontractor")}
                    {invite.expired ? ` · ${t("expired")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(invite.id)}
                  disabled={pending}
                  className="min-h-11 rounded-lg border border-white/15 px-4 text-xs font-semibold text-ink hover:bg-white/5 disabled:opacity-50"
                >
                  {t("revoke")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
