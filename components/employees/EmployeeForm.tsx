"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { inviteEmployeeAction, type InviteEmployeeState } from "@/src/features/employees/actions";
import { useSubmittedValues } from "@/components/auth/useSubmittedValues";

const field = "mt-2 min-h-12 w-full rounded-lg border border-white/10 bg-[#111827] px-4 text-base text-[#E5E7EB] outline-none placeholder:text-[#6B7280] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 user-invalid:border-red-400";
export default function EmployeeForm({ teams }: { teams: string[] }) {
  const t = useTranslations("employees");
  const [state, formAction] = useActionState(inviteEmployeeAction, { status: "idle", message: "" } as InviteEmployeeState);

  // Nine fields, and the two nobody has memorised are the start date and the
  // hourly rate. Losing those to a typo in the e-mail is the complaint in #74.
  const submitted = state.values ?? {};
  const { touched, onInput, formKey } = useSubmittedValues(
    `${JSON.stringify(state.values ?? null)}|${state.message}`,
  );
  const fields = [
    { id: "first-name", label: t("firstName"), name: "firstName", autoComplete: "given-name" },
    { id: "last-name", label: t("lastName"), name: "lastName", autoComplete: "family-name" },
    { id: "work-email", label: t("workEmail"), name: "email", autoComplete: "email", type: "email", placeholder: "name@company.com" },
    { id: "phone", label: t("phone"), name: "phone", autoComplete: "tel", type: "tel", optional: true },
    { id: "job-title", label: t("jobTitleLabel"), name: "jobTitle" },
  ];
  return <form action={formAction} className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2">{fields.map((item) => <div key={`${item.id}-${formKey}`}><label htmlFor={item.id} className="text-sm font-medium text-[#E5E7EB]">{item.label}</label><input id={item.id} name={item.name} type={item.type} autoComplete={item.autoComplete} required={!item.optional} placeholder={item.placeholder} defaultValue={submitted[item.name] ?? ""} onInput={onInput} className={field} /></div>)}<div><label htmlFor="team" className="text-sm font-medium text-[#E5E7EB]">{t("teamLabel")}</label><select key={`team-${formKey}`} id="team" name="team" defaultValue={submitted.team ?? ""} onInput={onInput} className={field}><option value="">{t("noTeam")}</option>{teams.map((team) => <option key={team} value={team}>{team}</option>)}</select></div><div><label htmlFor="employment-type" className="text-sm font-medium text-[#E5E7EB]">{t("employmentType")}</label><select key={`type-${formKey}`} id="employment-type" name="employmentType" required defaultValue={submitted.employmentType || "employee"} onInput={onInput} className={field}><option value="employee">{t("employmentTypeEmployee")}</option><option value="contractor">{t("employmentTypeContractor")}</option><option value="temporary">{t("employmentTypeTemporary")}</option></select></div><div><label htmlFor="hourly-rate" className="text-sm font-medium text-[#E5E7EB]">{t("hourlyRate")}</label><input key={`rate-${formKey}`} id="hourly-rate" name="hourlyRate" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={submitted.hourlyRate ?? ""} onInput={onInput} className={field} /></div><div className="sm:col-span-2"><label htmlFor="start-date" className="text-sm font-medium text-[#E5E7EB]">{t("startDate")}</label><input key={`start-${formKey}`} id="start-date" name="startDate" type="date" required defaultValue={submitted.startDate ?? ""} onInput={onInput} className={field} /></div></div>{state.status === "error" && !touched ? <p role="alert" className="mt-6 rounded-lg bg-red-400/10 p-4 text-sm leading-6 text-red-300">{state.message}</p> : <p className="mt-6 rounded-lg bg-[#22C55E]/8 p-4 text-sm leading-6 text-[#9CA3AF]">{t("invitationNotice")}</p>}<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/dashboard/employees" className="flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("cancel")}</Link><button type="submit" className="min-h-11 rounded-lg bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]">{t("sendInvitation")}</button></div></form>;
}
