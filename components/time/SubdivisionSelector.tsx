"use client";

import { useTranslations } from "next-intl";
import type { TrackerSite } from "@/src/features/time-tracking/data";

const control =
  "min-h-11 w-full rounded-xl border border-edge-10 bg-surface-alt px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Which part of the work location these hours belong to (#77).
 *
 * Renders nothing at all unless the chosen location has more than one
 * subdivision, and that is the whole design. Every location has one — created
 * with it, so a report always has something to group by — and offering a
 * dropdown with a single option would put a question on the screen of everybody
 * working at an undivided site, to be answered the only way it can be. The
 * database fills that case in itself.
 *
 * So the selector appears exactly when there is a decision to make: the
 * chantier that really was split into a first floor and a second.
 *
 * `name` is set so the manual-entry form can post it, and `onChange` is given
 * so the tracker can hold it in state. Both are wired; neither is required to
 * be used.
 */
export default function SubdivisionSelector({
  id = "tracker-subdivision",
  name,
  site,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  name?: string;
  site: TrackerSite | undefined;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("time");
  const areas = site?.areas ?? [];
  if (areas.length < 2) return null;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink-soft">
        {t("subdivisionLabel")} <span className="text-ink-subtle">{t("optional")}</span>
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={control}
      >
        {/*
          "Not specified" is a real answer and stays available. Somebody who
          worked across the whole chantier should not have to name a floor they
          were only half on — the report shows those hours as unattributed
          rather than folding them into a number that looks complete.
        */}
        <option value="">{t("noSubdivision")}</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {/* Translated for the one created with the location: its stored
                name is the location's own, which is nobody's choice and is in
                whichever language that location was named in. */}
            {area.isDefault ? t("subdivisionWholeLocation") : area.name}
          </option>
        ))}
      </select>
    </div>
  );
}
