"use client";

import { useActionState } from "react";
import { useSubmittedValues } from "@/components/auth/useSubmittedValues";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { updateEmployeeAction, type UpdateEmployeeState } from "@/src/features/employees/actions";
import type { Employee } from "@/lib/types/employee";

const field = "mt-2 min-h-12 w-full rounded-lg border border-edge-10 bg-surface-alt px-4 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20 user-invalid:border-red-400";

export default function EmployeeEditForm({ employee, teams }: { employee: Employee; teams: string[] }) {
  const t = useTranslations("employees");
  const [state, formAction] = useActionState(updateEmployeeAction, { status: "idle", messageKey: null } as UpdateEmployeeState);

  // Unlike the invite form, this one opens with the person's stored details —
  // so a refusal has to fall back to those, not to blank. What was typed wins
  // while it exists; the record is what it started from (#74).
  const submitted = state.values;
  const { touched, onInput, formKey } = useSubmittedValues(
    `${JSON.stringify(state.values ?? null)}|${state.messageKey ?? ""}`,
  );
  const kept = (name: string, stored: string) => submitted?.[name] ?? stored;

  // The list of teams comes from the people already assigned, so a team the
  // company has but nobody is on yet would be missing — and so would
  // "Unassigned". Both are added here so the current value is always present.
  // Real teams only, plus whatever this person is on in case it is not in the
  // list. "No team" is the empty option below, not an entry pretending to be a
  // team — which is what "Unassigned" was doing here.
  const teamOptions = [...new Set([...teams, employee.team].filter((name): name is string => Boolean(name)))].sort();

  const fields = [
    { id: "first-name", label: t("firstName"), name: "firstName", autoComplete: "given-name", defaultValue: employee.firstName },
    { id: "last-name", label: t("lastName"), name: "lastName", autoComplete: "family-name", defaultValue: employee.lastName },
    { id: "phone", label: t("phone"), name: "phone", autoComplete: "tel", type: "tel", optional: true, defaultValue: employee.phone ?? "" },
    { id: "job-title", label: t("jobTitleLabel"), name: "jobTitle", defaultValue: employee.jobTitle },
  ];

  return (
    <form action={formAction} className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-7">
      <input type="hidden" name="employeeId" value={employee.id} />
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map((item) => (
          <div key={`${item.id}-${formKey}`}>
            <label htmlFor={item.id} className="text-sm font-medium text-ink">{item.label}</label>
            <input id={item.id} name={item.name} type={item.type} autoComplete={item.autoComplete} required={!item.optional} defaultValue={kept(item.name, item.defaultValue)} onInput={onInput} className={field} />
          </div>
        ))}

        <div>
          <label htmlFor="edit-email" className="text-sm font-medium text-ink">{t("workEmail")}</label>
          <input id="edit-email" type="email" value={employee.email} disabled readOnly className={`${field} cursor-not-allowed opacity-60`} />
          <p className="mt-2 text-xs text-ink-subtle">{t("emailNotEditable")}</p>
        </div>

        <div>
          <label htmlFor="edit-team" className="text-sm font-medium text-ink">{t("teamLabel")}</label>
          <select key={`team-${formKey}`} id="edit-team" name="team" defaultValue={kept("team", employee.team ?? "")} onInput={onInput} className={field}>
            <option value="">{t("noTeam")}</option>
            {teamOptions.map((team) => <option key={team} value={team}>{team}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="edit-employment-type" className="text-sm font-medium text-ink">{t("employmentType")}</label>
          <select key={`type-${formKey}`} id="edit-employment-type" name="employmentType" required defaultValue={kept("employmentType", employee.employmentType)} onInput={onInput} className={field}>
            <option value="employee">{t("employmentTypeEmployee")}</option>
            <option value="contractor">{t("employmentTypeContractor")}</option>
            <option value="temporary">{t("employmentTypeTemporary")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="edit-start-date" className="text-sm font-medium text-ink">{t("startDate")}</label>
          <input key={`start-${formKey}`} id="edit-start-date" name="startDate" type="date" required defaultValue={kept("startDate", employee.startDate)} onInput={onInput} className={field} />
        </div>
      </div>

      {/* Keyed off the message, not the status: `messageKey` is null while
          idle, and testing it is what tells the compiler there is a key here. */}
      {state.messageKey && !touched ? (
        <p role="alert" className="mt-6 rounded-lg bg-red-400/10 p-4 text-sm leading-6 text-red-300">{t(state.messageKey)}</p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={`/dashboard/employees/${employee.id}`} className="flex min-h-11 items-center justify-center rounded-lg border border-edge-15 px-5 text-sm font-semibold text-ink hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-brand">{t("cancel")}</Link>
        <button type="submit" className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{t("saveChanges")}</button>
      </div>
    </form>
  );
}
