"use client";

import { useTranslations } from "next-intl";
import type { Task } from "@/lib/types/time";

type Props = { tasks: Task[]; value: string; onChange: (value: string) => void; disabled?: boolean; id?: string };
export default function TaskSelector({ tasks, value, onChange, disabled, id = "tracker-task" }: Props) {
  const t = useTranslations("time");
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-ink-soft">{t("task")}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="min-h-11 w-full rounded-xl border border-white/10 bg-surface-alt px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{t("noTask")}</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}</select></div>;
}
