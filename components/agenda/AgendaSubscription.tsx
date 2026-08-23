"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createAgendaFeedAction, revokeAgendaFeedAction } from "@/src/features/assignments/feed-actions";
import type { AgendaFeedState } from "@/src/features/assignments/data";

/**
 * Putting your own week on your phone (#49, passo 2).
 *
 * The hard part of this panel is not the button, it is the expectation. A
 * subscribed calendar refreshes on Google's cadence — hours, sometimes a day —
 * so a shift moved at 6am is not there when the worker wakes up. Someone who
 * believes the calendar is live will drive to the wrong address and be right to
 * be angry about it, which is why the warning is not a footnote here: it is the
 * sentence next to the button.
 *
 * The URL appears exactly once, on creation. Only its digest is stored, so
 * there is nothing to show later — the panel says so before it is generated
 * rather than after, when it would read as an apology.
 */
export default function AgendaSubscription({
  state,
  createdAtLabel,
  lastFetchedAtLabel,
}: {
  state: AgendaFeedState;
  createdAtLabel: string | null;
  lastFetchedAtLabel: string | null;
}) {
  const t = useTranslations("agenda");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; key: string } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  function create() {
    startTransition(async () => {
      const result = await createAgendaFeedAction();
      setMessage({ ok: result.ok, key: result.message });
      setUrl(result.ok ? (result.url ?? null) : null);
      setCopied(false);
      setConfirmingRevoke(false);
    });
  }

  function revoke() {
    startTransition(async () => {
      const result = await revokeAgendaFeedAction();
      setMessage({ ok: result.ok, key: result.message });
      if (result.ok) setUrl(null);
      setConfirmingRevoke(false);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard permission, or an insecure origin. The field is selectable
      // and the URL is on screen, so there is a way through that does not need
      // an error message.
      setCopied(false);
    }
  }

  const button =
    "inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <section className="rounded-2xl border border-edge-10 bg-surface p-5" aria-labelledby="agenda-feed-heading">
      <h2 id="agenda-feed-heading" className="text-base font-semibold text-ink">
        {t("feedTitle")}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm text-ink-dim">{t("feedDescription")}</p>

      {/*
        Not a footnote. This is the sentence that decides whether the feature
        helps or hurts: the calendar is where the week lives, and the app is
        where a change is confirmed.
      */}
      <p className="mt-2.5 max-w-2xl rounded-lg border border-edge-10 bg-surface-inset px-3.5 py-2.5 text-sm text-warning">
        {t("feedNotLive")}
      </p>

      {state.active ? (
        <dl className="mt-4 grid gap-1 text-sm text-ink-dim sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">{t("feedCreatedAt")}</dt>
            <dd className="text-ink">{createdAtLabel}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-ink-subtle">{t("feedLastRead")}</dt>
            {/*
              "Never read" is not a gap to hide. Together with a timestamp the
              worker does not recognise, this line is the only way a link that
              leaked ever becomes visible to the person it belongs to.
            */}
            <dd className="text-ink">{lastFetchedAtLabel ?? t("feedNeverRead")}</dd>
          </div>
        </dl>
      ) : null}

      {url ? (
        <div className="mt-4 grid gap-2">
          <label className="grid gap-1">
            <span className="text-[11px] uppercase tracking-wide text-ink-subtle">{t("feedUrlLabel")}</span>
            <input
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="min-h-11 w-full rounded-lg border border-edge-15 bg-canvas px-3 font-mono text-xs text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
          </label>
          <p className="text-sm text-warning">{t("feedShownOnce")}</p>
          <div>
            <button type="button" onClick={copy} className={`${button} bg-control text-ink hover:bg-control-hover`}>
              {copied ? t("feedCopied") : t("feedCopy")}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={create}
          disabled={pending}
          className={`${button} bg-brand text-on-brand hover:bg-brand-hover disabled:opacity-60`}
        >
          {state.active ? t("feedRegenerate") : t("feedCreate")}
        </button>

        {state.active && !confirmingRevoke ? (
          <button
            type="button"
            onClick={() => setConfirmingRevoke(true)}
            disabled={pending}
            className={`${button} border border-edge-15 text-ink hover:bg-edge-5 disabled:opacity-60`}
          >
            {t("feedRevoke")}
          </button>
        ) : null}

        {confirmingRevoke ? (
          <button
            type="button"
            onClick={revoke}
            disabled={pending}
            className={`${button} bg-danger text-on-brand hover:opacity-90 disabled:opacity-60`}
          >
            {t("feedRevokeConfirm")}
          </button>
        ) : null}
      </div>

      {/*
        Regenerating replaces the link, and the old one stops working the moment
        it does. Said before the click, not after: a worker who has already set
        the calendar up on two phones needs to know the second one goes dark.
      */}
      {state.active ? <p className="mt-2 text-xs text-ink-subtle">{t("feedRegenerateWarning")}</p> : null}

      {message ? (
        <p role="status" className={`mt-3 text-sm ${message.ok ? "text-success" : "text-danger-soft"}`}>
          {t(message.key)}
        </p>
      ) : null}
    </section>
  );
}
