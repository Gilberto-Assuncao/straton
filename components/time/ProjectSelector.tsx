"use client";

import { useTranslations } from "next-intl";
import type { Project } from "@/lib/types/time";

type Props = { projects: Project[]; value: string; onChange: (value: string) => void; disabled?: boolean; id?: string };
export default function ProjectSelector({ projects, value, onChange, disabled, id = "tracker-project" }: Props) {
  const t = useTranslations("time");
  return <div><label htmlFor={id} className="mb-2 block text-sm font-medium text-[#D1D5DB]">{t("project")}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none transition focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{t("noProject")}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>;
}
