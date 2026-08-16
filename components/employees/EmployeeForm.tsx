"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { inviteEmployeeAction, type InviteEmployeeState } from "@/src/features/employees/actions";
import { useSubmittedValues } from "@/components/auth/useSubmittedValues";

const field = "mt-2 min-h-12 w-full rounded-lg border border-edge-10 bg-surface-alt px-4 text-base text-ink outline-none placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20 user-invalid:border-red-400";
export default function EmployeeForm({ teams }: { teams: string[] }) {
  const t = useTranslations("employees");
  const [state, formAction] = useActionState(inviteEmployeeAction, { status: "idle", messageKey: null } as InviteEmployeeState);

  // Nine fields, and the two nobody has memorised are the start date and the
  // hourly rate. Losing those to a typo in the e-mail is the complaint in #74.
  const submitted = state.values ?? {};
  const { touched, onInput, formKey } = useSubmittedValues(
    `${JSON.stringify(state.values ?? null)}|${state.messageKey ?? ""}`,
  );
  const fields = [
    { id: "first-name", label: t("firstName"), name: "firstName", autoComplete: "given-name" },
    { id: "last-name", label: t("lastName"), name: "lastName", autoComplete: "family-name" },
    { id: "work-email", label: t("workEmail"), name: "email", autoComplete: "email", type: "email", placeholder: "name@company.com" },
    { id: "phone", label: t("phone"), name: "phone", autoComplete: "tel", type: "tel", optional: true },
    { id: "job-title", label: t("jobTitleLabel"), name: "jobTitle" },
  ];
  return <form action={formAction} className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2">{fields.map((item) => <div key={`${item.id}-${formKey}`}><label htmlFor={item.id} className="text-sm font-medium text-ink">{item.label}</label><input id={item.id} name={item.name} type={item.type} autoComplete={item.autoComplete} required={!item.optional} placeholder={item.placeholder} defaultValue={submitted[item.name] ?? ""} onInput={onInput} className={field} /></div>)}<div><label htmlFor="team" className="text-sm font-medium text-ink">{t("teamLabel")}</label><select key={`team-${formKey}`} id="team" name="team" defaultValue={submitted.team ?? ""} onInput={onInput} className={field}><option value="">{t("noTeam")}</option>{teams.map((team) => <option key={team} value={team}>{team}</option>)}</select></div><div><label htmlFor="employment-type" className="text-sm font-medium text-ink">{t("employmentType")}</label><select key={`type-${formKey}`} id="employment-type" name="employmentType" required defaultValue={submitted.employmentType || "employee"} onInput={onInput} className={field}><option value="employee">{t("employmentTypeEmployee")}</option><option value="contractor">{t("employmentTypeContractor")}</option><option value="temporary">{t("employmentTypeTemporary")}</option></select></div><div><label htmlFor="hourly-rate" className="text-sm font-medium text-ink">{t("hourlyRate")}</label><input key={`rate-${formKey}`} id="hourly-rate" name="hourlyRate" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={submitted.hourlyRate ?? ""} onInput={onInput} className={field} /></div><div className="sm:col-span-2"><label htmlFor="start-date" className="text-sm font-medium text-ink">{t("startDate")}</label><input key={`start-${formKey}`} id="start-date" name="startDate" type="date" required defaultValue={submitted.startDate ?? ""} onInput={onInput} className={field} /></div></div>{state.messageKey && !touched ? <p role="alert" className="mt-6 rounded-lg bg-red-400/10 p-4 text-sm leading-6 text-red-300">{t(state.messageKey)}</p> : <p className="mt-6 rounded-lg bg-brand/8 p-4 text-sm leading-6 text-ink-muted">{t("invitationNotice")}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/dashboard/employees" className="flex min-h-11 items-center justify-center rounded-lg border border-edge-15 px-5 text-sm font-semibold text-ink hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-brand">{t("cancel")}</Link><button type="submit" className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{t("sendInvitation")}</button></div></form>;
}
