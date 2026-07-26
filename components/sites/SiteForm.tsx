"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createSiteAction, updateSiteAction, type SiteFormState } from "@/src/features/sites/actions";
import { SITE_STATUSES, type SiteRecord } from "@/src/features/sites/types";

const field = "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-base text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 user-invalid:border-red-400";
const label = "text-sm font-medium text-[#E5E7EB]";

export default function SiteForm({ site, projects }: { site?: SiteRecord; projects: { id: string; name: string }[] }) {
  const t = useTranslations("sites");
  const [state, formAction] = useActionState(
    site ? updateSiteAction : createSiteAction,
    { status: "idle", message: "" } as SiteFormState,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7">
      {site ? <input type="hidden" name="siteId" value={site.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="site-name" className={label}>{t("nameLabel")}</label>
          <input id="site-name" name="name" required minLength={2} defaultValue={site?.name} placeholder={t("namePlaceholder")} className={field} />
        </div>

        <div>
          <label htmlFor="site-reference" className={label}>{t("referenceLabel")}</label>
          <input id="site-reference" name="reference" defaultValue={site?.reference ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="site-project" className={label}>{t("projectLabel")}</label>
          <select id="site-project" name="projectId" defaultValue={site?.projectId ?? ""} className={field}>
            <option value="">{t("noProject")}</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="site-street" className={label}>{t("streetLabel")}</label>
          <input id="site-street" name="street" defaultValue={site?.address.street ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="site-city" className={label}>{t("cityLabel")}</label>
          <input id="site-city" name="city" defaultValue={site?.address.city ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="site-postal" className={label}>{t("postalLabel")}</label>
          <input id="site-postal" name="postal_code" defaultValue={site?.address.postal_code ?? ""} className={field} />
        </div>

        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-[#111C33] p-4">
          <p className="text-sm font-semibold text-[#E5E7EB]">{t("coordinatesTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-[#9CA3AF]">{t("coordinatesHelp")}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="site-latitude" className={label}>{t("latitudeLabel")}</label>
              <input id="site-latitude" name="latitude" type="number" step="any" min="-90" max="90" inputMode="decimal" defaultValue={site?.latitude ?? ""} placeholder="50.8503" className={field} />
            </div>
            <div>
              <label htmlFor="site-longitude" className={label}>{t("longitudeLabel")}</label>
              <input id="site-longitude" name="longitude" type="number" step="any" min="-180" max="180" inputMode="decimal" defaultValue={site?.longitude ?? ""} placeholder="4.3517" className={field} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="site-po" className={label}>{t("poLabel")}</label>
          <input id="site-po" name="poNumber" defaultValue={site?.poNumber ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="site-cost-center" className={label}>{t("costCenterLabel")}</label>
          <input id="site-cost-center" name="costCenter" defaultValue={site?.costCenter ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="site-starts" className={label}>{t("startsAtLabel")}</label>
          <input id="site-starts" name="startsAt" type="date" defaultValue={site?.startsAt ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="site-ends" className={label}>{t("endsAtLabel")}</label>
          <input id="site-ends" name="endsAt" type="date" defaultValue={site?.endsAt ?? ""} className={field} />
        </div>

        <div>
          <label htmlFor="site-status" className={label}>{t("statusLabel")}</label>
          <select id="site-status" name="status" defaultValue={site?.status ?? "active"} className={field}>
            {SITE_STATUSES.map((value) => <option key={value} value={value}>{t(`status_${value}` as "status_active")}</option>)}
          </select>
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
