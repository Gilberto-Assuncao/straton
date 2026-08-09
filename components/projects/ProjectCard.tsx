"use client";

import { useTranslations } from "next-intl";
import Link from "next/link"; import type { Client, Project } from "@/lib/types/project"; import ProjectStatusBadge from "./ProjectStatusBadge";
export default function ProjectCard({ project, client }: { project: Project; client?: Client }) {
  const t = useTranslations("projects");
  const progress = Math.min(100, Math.round(project.workedHours / project.estimatedHours * 100));
  return <li className="rounded-2xl border border-white/10 bg-[#161A34] p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-[#E5E7EB]">{project.name}</h3><p className="mt-1 text-sm text-[#9CA3AF]">{client?.companyName ?? t("noClient")}</p></div><ProjectStatusBadge status={project.status}/></div><p className="mt-4 text-xs capitalize text-[#9CA3AF]">{t("priorityLabel", { priority: t(`priority${project.priority.charAt(0).toUpperCase()}${project.priority.slice(1)}`) })}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#22C55E]" style={{ width: `${progress}%` }}/></div><p className="mt-2 text-sm text-[#D1D5DB]">{t("hoursOf", { worked: project.workedHours, estimated: project.estimatedHours, progress })}</p><Link href={`/dashboard/projects/${project.id}`} className="mt-4 flex min-h-11 items-center justify-center rounded-lg border border-white/15 text-sm font-semibold text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]">{t("viewProject")}</Link></li>;
}
