"use client";

import { useState } from "react";
import type { TrackerSite } from "@/src/features/time-tracking/data";
import { useTranslations } from "next-intl";
import ProjectSelector from "@/components/time/ProjectSelector";
import SubdivisionSelector from "@/components/time/SubdivisionSelector";
import TaskSelector from "@/components/time/TaskSelector";
import type { Project, Task } from "@/lib/types/time";

type Props = { projects: Project[]; tasks: Task[]; sites: TrackerSite[]; feedback: string; action: (formData: FormData) => void };
const inputClass = "min-h-11 w-full rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none transition [color-scheme:dark] focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20";
export default function ManualEntryForm({ projects, tasks, sites, feedback, action }: Props) {
  const t = useTranslations("time");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  // Optional here too: a manual entry for office work has no chantier.
  const [siteId, setSiteId] = useState("");
  // Cleared with the location, because a subdivision of the chantier you just
  // switched away from is a pairing the database refuses.
  const [siteAreaId, setSiteAreaId] = useState("");
  return <section aria-labelledby="manual-entry-title" className="rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6"><div><h3 id="manual-entry-title" className="text-lg font-semibold text-[#E5E7EB]">{t("manualEntryTitle")}</h3><p className="mt-1 text-xs text-[#9CA3AF]">{t("manualEntrySubtitle")}</p></div><form className="mt-6 grid gap-4" action={action}><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="taskId" value={taskId} /><div className="grid gap-4 sm:grid-cols-3"><div><label htmlFor="manual-date" className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("date")}</label><input id="manual-date" name="date" type="date" required className={inputClass} /></div><div><label htmlFor="manual-start" className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("startTime")}</label><input id="manual-start" name="startTime" type="time" required className={inputClass} /></div><div><label htmlFor="manual-end" className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("endTime")}</label><input id="manual-end" name="endTime" type="time" required className={inputClass} /></div></div><div className="grid gap-4 sm:grid-cols-2"><ProjectSelector id="manual-project" projects={projects} value={projectId} onChange={setProjectId} /><TaskSelector id="manual-task" tasks={tasks} value={taskId} onChange={setTaskId} /></div><div><label htmlFor="manual-site" className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("siteLabel")}</label><select id="manual-site" name="siteId" value={siteId} onChange={(event) => { setSiteId(event.target.value); setSiteAreaId(""); }} className={inputClass}><option value="">{t("noSite")}</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div><SubdivisionSelector id="manual-subdivision" name="siteAreaId" site={sites.find((site) => site.id === siteId)} value={siteAreaId} onChange={setSiteAreaId} /><div><label htmlFor="manual-notes" className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("notesLabel")} <span className="text-[#6B7280]">{t("optional")}</span></label><textarea id="manual-notes" name="notes" maxLength={300} rows={3} className={`${inputClass} py-3`} /></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p aria-live="polite" className="text-sm text-[#4ADE80]">{feedback}</p><button type="submit" className="min-h-11 rounded-xl bg-[#22C55E] px-5 text-sm font-semibold text-[#07110B] transition hover:bg-[#16A34A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]">{t("saveEntry")}</button></div></form></section>;
}
