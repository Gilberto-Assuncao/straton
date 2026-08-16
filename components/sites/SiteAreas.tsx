"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { SiteMessageKey } from "@/src/features/sites/messages";
import {
  createSiteAreaAction,
  deleteSiteAreaAction,
  renameSiteAreaAction,
  setSiteAreaActiveAction,
} from "@/src/features/sites/actions";
import type { SiteAreaRecord } from "@/src/features/sites/types";

const card = "rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6";
const field =
  "min-h-11 w-full rounded-lg border border-edge-15 bg-surface-inset px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-bright";
const secondaryButton =
  "min-h-11 rounded-lg border border-edge-15 px-4 text-xs font-semibold text-ink hover:bg-edge-5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-bright";

export default function SiteAreas({ siteId, areas }: { siteId: string; areas: SiteAreaRecord[] }) {
  const t = useTranslations("sites");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; messageKey: SiteMessageKey } | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * The default subdivision is shown translated, not by its stored name.
   *
   * The trigger names it after the location, which is not a label anybody
   * chose — and the product speaks ten languages, so the row the earlier
   * backfill wrote reads "Todo o local" in a German company's database. Once
   * somebody renames it the flag clears server-side and their name is what
   * shows, here and everywhere else.
   */
  function displayName(area: SiteAreaRecord): string {
    return area.isDefault ? t("areaWholeLocation") : area.name;
  }

  function run(action: () => Promise<{ ok: boolean; messageKey: SiteMessageKey }>, onOk?: () => void) {
    startTransition(async () => {
      const result = await action();
      setFeedback(result);
      if (result.ok) onOk?.();
    });
  }

  const onlyOne = areas.length === 1;

  return (
    <div className="grid gap-5">
      <div className={card}>
        <h2 className="text-lg font-semibold text-ink">{t("areasTitle")}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t("areasSubtitle")}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs text-ink-muted">{t("areaNameLabel")}</span>
            <input
              // Named so a test can find it. Every label here is translated, so
              // a locator written against the wording breaks the day the suite
              // runs in another locale — the same reason `#site-name` and
              // `#login-email` exist.
              id="area-name"
              className={field}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("areaNamePlaceholder")}
              maxLength={120}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs text-ink-muted">{t("areaDescriptionLabel")}</span>
            <input
              className={field}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={280}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              run(() => createSiteAreaAction(siteId, name, description), () => {
                setName("");
                setDescription("");
              })
            }
            disabled={pending || name.trim().length < 2}
            className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-bright"
          >
            {pending ? t("areaAdding") : t("areaAdd")}
          </button>
        </div>

        {feedback ? (
          <p role="status" className={`mt-4 text-sm ${feedback.ok ? "text-brand-bright" : "text-red-300"}`}>
            {t(feedback.messageKey)}
          </p>
        ) : null}
      </div>

      <div className={card}>
        <h3 className="text-sm font-semibold text-ink">{t("areasListTitle")}</h3>
        <ul className="mt-4 divide-y divide-edge-10">
          {areas.map((area) => (
            // Carries its id so a test can act on one row rather than on
            // whichever the buttons happen to match — every row here has the
            // same three buttons, and the default one is shown under a
            // translated name that is not in the database at all.
            <li key={area.id} data-area-id={area.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              {editing?.id === area.id ? (
                <>
                  <label className="min-w-0 flex-1 grid gap-1.5 text-sm">
                    <span className="sr-only">{t("areaNameLabel")}</span>
                    <input
                      className={field}
                      value={editing.name}
                      onChange={(event) => setEditing({ id: area.id, name: event.target.value })}
                      placeholder={t("areaNamePlaceholder")}
                      maxLength={120}
                      autoFocus
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        run(() => renameSiteAreaAction(siteId, area.id, editing.name), () => setEditing(null))
                      }
                      disabled={pending || editing.name.trim().length < 2}
                      className={secondaryButton}
                    >
                      {t("areaSave")}
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={secondaryButton}>
                      {t("cancel")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{displayName(area)}</p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      {[area.description, area.isDefault ? t("areaDefaultHint") : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {!area.isActive ? (
                      <span className="inline-flex min-h-7 items-center rounded-full bg-edge-10 px-3 text-xs font-semibold text-ink-muted">
                        {t("areaClosed")}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      /*
                        Empty for the default one, not prefilled with what is
                        on screen. "Whole location" is a translation, and
                        saving it unchanged would write an English or
                        Portuguese string into the database as the name — which
                        is the exact mistake the earlier backfill made and the
                        `is_default` flag was added to undo. Renaming this row
                        *is* giving it a name, so the box asks for one.
                      */
                      onClick={() => setEditing({ id: area.id, name: area.isDefault ? "" : area.name })}
                      disabled={pending}
                      className={secondaryButton}
                    >
                      {t("areaRename")}
                    </button>
                    <button
                      type="button"
                      onClick={() => run(() => setSiteAreaActiveAction(siteId, area.id, !area.isActive))}
                      disabled={pending}
                      className={secondaryButton}
                    >
                      {area.isActive ? t("areaClose") : t("areaReopen")}
                    </button>
                    {/*
                      Said out loud rather than left as a disabled button with
                      no explanation — the greyed-out control whose only reason
                      lives in a tooltip was reported as broken once already,
                      and tooltips do not exist on a phone.

                      The database refuses this too (migration 202608100005).
                      This is the sentence, not the safeguard.
                    */}
                    <button
                      type="button"
                      onClick={() => run(() => deleteSiteAreaAction(siteId, area.id))}
                      disabled={pending || onlyOne}
                      className={secondaryButton}
                    >
                      {t("areaDelete")}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>

        {onlyOne ? <p className="mt-4 text-xs leading-5 text-ink-subtle">{t("areasKeepOne")}</p> : null}
      </div>
    </div>
  );
}
