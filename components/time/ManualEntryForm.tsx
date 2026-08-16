"use client";

import { useState } from "react";
import type { TrackerSite } from "@/src/features/time-tracking/data";
import { useTranslations } from "next-intl";
import SubdivisionSelector from "@/components/time/SubdivisionSelector";
import TaskSelector from "@/components/time/TaskSelector";
import type { Task } from "@/lib/types/time";

type Props = { tasks: Task[]; sites: TrackerSite[]; feedback: string; action: (formData: FormData) => void };
const inputClass = "min-h-11 w-full rounded-xl border border-edge-10 bg-surface-alt px-3 text-sm text-ink outline-none transition [color-scheme:dark] focus:border-brand focus:ring-2 focus:ring-brand/20";
export default function ManualEntryForm({ tasks, sites, feedback, action }: Props) {
  const t = useTranslations("time");
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "");
  // Optional here too: a manual entry for office work has no chantier.
  const [siteId, setSiteId] = useState("");
  // Cleared with the location, because a subdivision of the chantier you just
  // switched away from is a pairing the database refuses.
  const [siteAreaId, setSiteAreaId] = useState("");
  return <section aria-labelledby="manual-entry-title" className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6"><div><h3 id="manual-entry-title" className="text-lg font-semibold text-ink">{t("manualEntryTitle")}</h3><p className="mt-1 text-xs text-ink-muted">{t("manualEntrySubtitle")}</p></div><form className="mt-6 grid gap-4" action={action}><input type="hidden" name="taskId" value={taskId} /><div className="grid gap-4 sm:grid-cols-3"><div><label htmlFor="manual-date" className="mb-2 block text-sm font-medium text-ink-soft">{t("date")}</label><input id="manual-date" name="date" type="date" required className={inputClass} /></div><div><label htmlFor="manual-start" className="mb-2 block text-sm font-medium text-ink-soft">{t("startTime")}</label><input id="manual-start" name="startTime" type="time" required className={inputClass} /></div><div><label htmlFor="manual-end" className="mb-2 block text-sm font-medium text-ink-soft">{t("endTime")}</label><input id="manual-end" name="endTime" type="time" required className={inputClass} /></div></div><TaskSelector id="manual-task" tasks={tasks} value={taskId} onChange={setTaskId} /><div><label htmlFor="manual-site" className="mb-2 block text-sm font-medium text-ink-soft">{t("siteLabel")}</label><select id="manual-site" name="siteId" value={siteId} onChange={(event) => { setSiteId(event.target.value); setSiteAreaId(""); }} className={inputClass}><option value="">{t("noSite")}</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div><SubdivisionSelector id="manual-subdivision" name="siteAreaId" site={sites.find((site) => site.id === siteId)} value={siteAreaId} onChange={setSiteAreaId} /><div><label htmlFor="manual-notes" className="mb-2 block text-sm font-medium text-ink-soft">{t("notesLabel")} <span className="text-ink-subtle">{t("optional")}</span></label><textarea id="manual-notes" name="notes" maxLength={300} rows={3} className={`${inputClass} py-3`} /></div><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p aria-live="polite" className="text-sm text-brand-bright">{feedback}</p><button type="submit" className="min-h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">{t("saveEntry")}</button></div></form></section>;
}
