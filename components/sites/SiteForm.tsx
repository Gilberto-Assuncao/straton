"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createSiteAction, geocodeSiteAddressAction, updateSiteAction, type SiteFormState } from "@/src/features/sites/actions";
import { SITE_PRIORITIES, SITE_STATUSES, type ClientOption, type SiteRecord } from "@/src/features/sites/types";
import ClientPicker from "./ClientPicker";

const field = "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-base text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 user-invalid:border-red-400";
const label = "text-sm font-medium text-[#E5E7EB]";

type Fields = Record<string, string>;

/** The stored location, or an empty form. */
function storedFields(site?: SiteRecord): Fields {
  return {
    name: site?.name ?? "",
    reference: site?.reference ?? "",
    projectId: site?.projectId ?? "",
    street: site?.address.street ?? "",
    city: site?.address.city ?? "",
    postal_code: site?.address.postal_code ?? "",
    latitude: site?.latitude?.toString() ?? "",
    longitude: site?.longitude?.toString() ?? "",
    poNumber: site?.poNumber ?? "",
    costCenter: site?.costCenter ?? "",
    startsAt: site?.startsAt ?? "",
    endsAt: site?.endsAt ?? "",
    status: site?.status ?? "active",
    priority: site?.priority ?? "medium",
    estimatedHours: site?.estimatedHours?.toString() ?? "",
    budgetAmount: site?.budgetAmount?.toString() ?? "",
    budgetCurrency: site?.budgetCurrency ?? "EUR",
    description: site?.description ?? "",
  };
}

export default function SiteForm({ site, projects, clients }: { site?: SiteRecord; projects: { id: string; name: string }[]; clients: ClientOption[] }) {
  const t = useTranslations("sites");
  const [state, formAction] = useActionState(
    site ? updateSiteAction : createSiteAction,
    { status: "idle", message: "" } as SiteFormState,
  );

  /**
   * Every field is controlled, and a refusal puts back what was typed.
   *
   * React resets a form once its action has run, so anything driven by
   * `defaultValue` returned to the stored value — the edit silently discarded,
   * with a red error above fields no longer showing the attempt it describes.
   * Reported against the availability form and fixed there in #75; registered
   * as #74 for the eight others, of which this is one. Fixed here rather than
   * left for the sweep because this change is what puts five more fields on
   * it, and five more things to retype is a worse form than the one before.
   *
   * The same shape as #75 deliberately: controlled state, re-seeded when a new
   * answer arrives. Leaving them uncontrolled and merely rendering a new
   * `defaultValue` would depend on the reset landing after the re-render — a
   * detail of React's scheduling, for a bug whose whole nature is that it
   * fails silently.
   */
  const [fields, setFields] = useState<Fields>(() => ({ ...storedFields(site), ...state.values }));

  function set(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  // Re-seeded only when a *new* answer comes back, so typing between two
  // submissions is never overwritten by the values of the first.
  const seed = JSON.stringify(state.values ?? null);
  const [seenSeed, setSeenSeed] = useState(seed);
  if (seenSeed !== seed) {
    setSeenSeed(seed);
    if (state.values) setFields({ ...storedFields(site), ...state.values });
  }

  const [geocoding, startGeocoding] = useTransition();
  const [geocodeNote, setGeocodeNote] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const canGeocode = Boolean(fields.postal_code.trim() || fields.city.trim());
  const located = Boolean(fields.latitude.trim() && fields.longitude.trim());

  function findCoordinates() {
    setGeocodeNote(null);
    startGeocoding(async () => {
      const result = await geocodeSiteAddressAction({
        street: fields.street,
        postalCode: fields.postal_code,
        city: fields.city,
        countryCode: "be",
      });
      if (!result.ok) {
        setGeocodeNote({ kind: "error", text: t(`geocode_${result.reason}` as "geocode_no_match") });
        return;
      }
      setFields((current) => ({
        ...current,
        latitude: result.latitude.toString(),
        longitude: result.longitude.toString(),
      }));
      setGeocodeNote({ kind: "ok", text: t("geocodeFound", { address: result.matchedAddress }) });
    });
  }

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
      {site ? <input type="hidden" name="siteId" value={site.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="site-name" className={label}>{t("nameLabel")}</label>
          <input id="site-name" name="name" required minLength={2} value={fields.name} onChange={(event) => set("name", event.target.value)} placeholder={t("namePlaceholder")} className={field} />
        </div>

        <div>
          <label htmlFor="site-reference" className={label}>{t("referenceLabel")}</label>
          <input id="site-reference" name="reference" value={fields.reference} onChange={(event) => set("reference", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-project" className={label}>{t("projectLabel")}</label>
          <select id="site-project" name="projectId" value={fields.projectId} onChange={(event) => set("projectId", event.target.value)} className={field}>
            <option value="">{t("noProject")}</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>

        {/* Holds its own selection in state, so the reset does not reach it. */}
        <ClientPicker clients={clients} defaultValue={site?.clientCompanyId} />

        <div className="sm:col-span-2">
          <label htmlFor="site-street" className={label}>{t("streetLabel")}</label>
          <input id="site-street" name="street" value={fields.street} onChange={(event) => set("street", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-city" className={label}>{t("cityLabel")}</label>
          <input id="site-city" name="city" value={fields.city} onChange={(event) => set("city", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-postal" className={label}>{t("postalLabel")}</label>
          <input id="site-postal" name="postal_code" value={fields.postal_code} onChange={(event) => set("postal_code", event.target.value)} className={field} />
        </div>

        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-[#111C33] p-4">
          <p className="text-sm font-semibold text-[#E5E7EB]">{t("locationTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{t("locationHelp")}</p>
          <button
            type="button"
            onClick={findCoordinates}
            disabled={geocoding || !canGeocode}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 text-sm font-semibold text-[#4ADE80] transition hover:bg-[#22C55E]/20 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
          >
            {geocoding ? t("geocodeSearching") : t("geocodeFromAddress")}
          </button>
          {/*
            Said out loud, not hidden in a `title`.
            
            A greyed-out button whose only explanation is a tooltip reads as
            broken — reported as exactly that. Tooltips do not exist on a phone,
            and this form is used on phones.
          */}
          {!canGeocode ? (
            <p className="mt-2 text-xs leading-5 text-[#9CA3AF]">{t("geocodeNeedsAddress")}</p>
          ) : null}
          {geocodeNote ? (
            <p role="status" className={`mt-3 text-xs leading-5 ${geocodeNote.kind === "ok" ? "text-[#4ADE80]" : "text-amber-300"}`}>{geocodeNote.text}</p>
          ) : null}

          {/*
            The coordinates travel as hidden fields and are never shown or typed.
            Nobody knows the latitude of a roof, and a pair of decimals on screen
            is a number a site manager cannot check, cannot correct and cannot
            act on — so it is worse than nothing. The address is the thing a
            human can verify; the coordinates are how the map and the weather
            forecast find it.
          */}
          <input type="hidden" name="latitude" value={fields.latitude} />
          <input type="hidden" name="longitude" value={fields.longitude} />

          <p className={`mt-4 text-xs font-semibold ${located ? "text-[#4ADE80]" : "text-amber-300"}`}>
            {located ? t("locationConfirmed") : t("locationMissing")}
          </p>
          {!located ? <p className="mt-1 text-xs leading-5 text-[#6B7280]">{t("locationMissingHelp")}</p> : null}
        </div>

        <div>
          <label htmlFor="site-po" className={label}>{t("poLabel")}</label>
          <input id="site-po" name="poNumber" value={fields.poNumber} onChange={(event) => set("poNumber", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-cost-center" className={label}>{t("costCenterLabel")}</label>
          <input id="site-cost-center" name="costCenter" value={fields.costCenter} onChange={(event) => set("costCenter", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-starts" className={label}>{t("startsAtLabel")}</label>
          <input id="site-starts" name="startsAt" type="date" value={fields.startsAt} onChange={(event) => set("startsAt", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-ends" className={label}>{t("endsAtLabel")}</label>
          <input id="site-ends" name="endsAt" type="date" value={fields.endsAt} onChange={(event) => set("endsAt", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-status" className={label}>{t("statusLabel")}</label>
          <select id="site-status" name="status" value={fields.status} onChange={(event) => set("status", event.target.value)} className={field}>
            {SITE_STATUSES.map((value) => <option key={value} value={value}>{t(`status_${value}` as "status_active")}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="site-priority" className={label}>{t("priorityLabel")}</label>
          <select id="site-priority" name="priority" value={fields.priority} onChange={(event) => set("priority", event.target.value)} className={field}>
            {SITE_PRIORITIES.map((value) => <option key={value} value={value}>{t(`priority_${value}` as "priority_medium")}</option>)}
          </select>
        </div>

        {/*
          The planning that moved from the project to the location (#77).

          None of it is required, and that is the decision rather than an
          oversight: the project form made all four mandatory, and a required
          field with no answer is how three different screens became dead ends
          in a single day. A company that has not costed a job yet still has
          people on it, and their hours are the part that cannot be recovered
          later.
        */}
        <div>
          <label htmlFor="site-estimated-hours" className={label}>{t("estimatedHoursLabel")}</label>
          <input id="site-estimated-hours" name="estimatedHours" type="number" min="0" step="0.5" inputMode="decimal" value={fields.estimatedHours} onChange={(event) => set("estimatedHours", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-budget" className={label}>{t("budgetLabel")}</label>
          <input id="site-budget" name="budgetAmount" type="number" min="0" step="0.01" inputMode="decimal" value={fields.budgetAmount} onChange={(event) => set("budgetAmount", event.target.value)} className={field} />
        </div>

        <div>
          <label htmlFor="site-currency" className={label}>{t("currencyLabel")}</label>
          <input id="site-currency" name="budgetCurrency" maxLength={3} value={fields.budgetCurrency} onChange={(event) => set("budgetCurrency", event.target.value)} className={field} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="site-description" className={label}>{t("descriptionLabel")}</label>
          <textarea id="site-description" name="description" rows={4} value={fields.description} onChange={(event) => set("description", event.target.value)} className={`${field} py-3`} />
        </div>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="mt-6 rounded-lg bg-red-400/10 p-4 text-sm leading-6 text-red-300">{state.message}</p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/dashboard/sites" className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("cancel")}</Link>
        <button type="submit" className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]">{site ? t("saveChanges") : t("createSite")}</button>
      </div>
    </form>
  );
}
