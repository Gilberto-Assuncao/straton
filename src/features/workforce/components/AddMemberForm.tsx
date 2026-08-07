"use client";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui";
import { DateInput, EmailInput, Select, TextInput } from "@/src/components/forms";
import type { WorkforceTeamView } from "../types";

const ROLES = ["owner", "admin", "manager", "supervisor", "employee", "contractor", "viewer"] as const;
const EMPLOYMENT_TYPES = [
  "employee",
  "worker",
  "contractor",
  "freelancer",
  "temporary",
  "intern",
  "apprentice",
  "company_owner",
] as const;

/**
 * The language options stay in their own language.
 *
 * A Dutch speaker looking for their language wants to see "Nederlands", not
 * "Dutch" translated into whatever the interface happens to be showing — which
 * is why every language picker on the web lists endonyms.
 */
const LANGUAGES = ["English", "Português", "Français", "Nederlands", "Deutsch"].map((label) => ({
  value: label.toLowerCase(),
  label,
}));

export function AddMemberForm({ teams, onClose }: { teams: WorkforceTeamView[]; onClose: () => void }) {
  const t = useTranslations("workforce");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onClose();
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-5 rounded-lg bg-blue-400/10 p-3 text-sm text-blue-200">{t("demoNotice")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput id="member-name" name="name" label={t("fieldName")} required minLength={2} />
        <EmailInput id="member-email" name="email" label={t("fieldEmail")} required />
        <Select
          id="member-role"
          name="role"
          label={t("fieldRole")}
          options={ROLES.map((value) => ({ value, label: t(`role_${value}` as "role_owner") }))}
          required
        />
        <Select
          id="employment-type"
          name="employmentType"
          label={t("fieldEmploymentType")}
          options={EMPLOYMENT_TYPES.map((value) => ({ value, label: t(`type_${value}` as "type_employee") }))}
          required
        />
        <TextInput id="job-title" name="jobTitle" label={t("fieldJobTitle")} required />
        <Select
          id="member-team"
          name="teamId"
          label={t("fieldTeam")}
          options={[{ value: "", label: t("fieldNoTeam") }, ...teams.map((team) => ({ value: team.id, label: team.name }))]}
        />
        <DateInput id="member-start-date" name="startDate" label={t("fieldStartDate")} required />
        <Select id="preferred-language" name="language" label={t("fieldLanguage")} options={LANGUAGES} required />
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
        <Button type="submit">{t("prepareInvitation")}</Button>
      </div>
    </form>
  );
}
