"use client";

import { locales, localeLabels } from "@/src/i18n/routing";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Select, Switch } from "@/src/components/forms";
import { updateCompanySettingsAction } from "../actions";
import { initialCompanyActionState, type CompanySettingsValues } from "../types";
import { CompanyFormStatus } from "./CompanyFormStatus";
import { CompanySubmitButton } from "./CompanySubmitButton";

/**
 * Language names stay as endonyms — "Nederlands", not "Dutch".
 *
 * This picker sets the company's default language, so whoever reads it is
 * looking for their own language by its own name. Translating them would mean a
 * Dutch speaker hunting for "Neerlandês" in a Portuguese interface.
 */
const LANGUAGES = locales.map((value) => ({ value, label: localeLabels[value] }));

export function CompanySettingsForm({
  companyId,
  values,
  canEdit,
}: {
  companyId: string;
  values: CompanySettingsValues;
  canEdit: boolean;
}) {
  const t = useTranslations("companies");
  const [state, action] = useActionState(updateCompanySettingsAction.bind(null, companyId), initialCompanyActionState);
  const [remindersEnabled, setRemindersEnabled] = useState(values.punctualityRemindersEnabled);

  /** Field errors arrive as keys; the sentence is chosen here. */
  const error = (name: keyof CompanySettingsValues) => {
    const key = state.fieldErrors?.[name];
    return key ? t(`error_${key}` as "error_status") : undefined;
  };

  return (
    <form action={action} className="space-y-6">
      <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2 disabled:opacity-75">
        <Select name="defaultLanguage" label={t("fieldDefaultLanguage")} defaultValue={values.defaultLanguage} error={error("defaultLanguage")} options={LANGUAGES} />
        <Select
          name="timezone"
          label={t("fieldTimezone")}
          defaultValue={values.timezone}
          error={error("timezone")}
          options={["Europe/Brussels", "Europe/Amsterdam", "Europe/Paris", "Europe/Berlin", "Europe/Lisbon"].map((value) => ({ value, label: value }))}
        />
        <Select name="currencyCode" label={t("fieldCurrency")} defaultValue={values.currencyCode} error={error("currencyCode")} options={["EUR", "GBP", "USD"].map((value) => ({ value, label: value }))} />
        <Select name="dateFormat" label={t("fieldDateFormat")} defaultValue={values.dateFormat} error={error("dateFormat")} options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((value) => ({ value, label: value }))} />
        <Select
          name="timeFormat"
          label={t("fieldTimeFormat")}
          defaultValue={values.timeFormat}
          error={error("timeFormat")}
          options={[{ value: "24h", label: "24h" }, { value: "12h", label: "12h" }]}
        />
        <Select
          name="weekStartsOn"
          label={t("fieldFirstDay")}
          defaultValue={values.weekStartsOn}
          error={error("weekStartsOn")}
          // Day names come from the browser's own locale data rather than from
          // the message files — there is no reason to hand-translate the days
          // of the week nine times.
          options={[1, 0, 6].map((day) => ({
            value: String(day),
            label: new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(new Date(Date.UTC(2024, 0, 7 + day))),
          }))}
        />
        <Select
          name="status"
          label={t("fieldOperationalStatus")}
          defaultValue={values.status === "archived" ? "inactive" : values.status}
          error={error("status")}
          options={[
            { value: "active", label: t("status_active") },
            { value: "inactive", label: t("status_inactive") },
            { value: "suspended", label: t("status_suspended") },
          ]}
        />
      </fieldset>

      <fieldset disabled={!canEdit} className="grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-2 disabled:opacity-75">
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold text-[#E5E7EB]">{t("punctualityReminders")}</h3>
          <p className="mt-1 text-xs text-[#9CA3AF]">{t("punctualityHint")}</p>
        </div>
        <Input name="expectedStartTime" type="time" label={t("fieldExpectedStart")} defaultValue={values.expectedStartTime} error={error("expectedStartTime")} />
        <Input name="expectedEndTime" type="time" label={t("fieldExpectedEnd")} defaultValue={values.expectedEndTime} error={error("expectedEndTime")} />
        <Input name="graceMinutes" type="number" min="0" max="180" label={t("fieldGracePeriod")} defaultValue={values.graceMinutes} error={error("graceMinutes")} />
        <div className="flex items-end">
          <input type="hidden" name="punctualityRemindersEnabled" value={remindersEnabled ? "on" : "off"} />
          <Switch label={t("sendPunctualityReminders")} checked={remindersEnabled} onChange={setRemindersEnabled} />
        </div>
      </fieldset>

      <CompanyFormStatus state={state} />
      {canEdit ? (
        <div className="flex justify-end">
          <CompanySubmitButton label={t("saveSettings")} pendingLabel={t("savingSettings")} />
        </div>
      ) : (
        <p className="text-sm text-[#9CA3AF]">{t("readOnlySettings")}</p>
      )}
    </form>
  );
}
