"use client";

import { useTranslations } from "next-intl";
import ProjectStatusBadge from "./ProjectStatusBadge";
import type { Client, Project } from "@/lib/types/project";

export default function FeaturedProjects({ projects, clientById }: { projects: Project[]; clientById: Map<string, Client> }) {
  const t = useTranslations("projects");
  const featured = projects.filter((project) => project.status === "active").slice(0, 3);
  if (featured.length === 0) return null;

  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-3">
      {featured.map((project) => {
        const client = project.clientId ? clientById.get(project.clientId) : undefined;
        const progress = project.estimatedHours > 0 ? Math.min(100, Math.round((project.workedHours / project.estimatedHours) * 100)) : 0;
        return (
          <div key={project.id} className="rounded-2xl border border-white/10 bg-[#161A34] p-5.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[#E5E7EB]">{project.name}</span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="mt-3 text-sm text-[#9CA3AF]">{client?.companyName ?? "—"}</p>
            <p className="mt-4 font-mono text-2xl font-bold text-[#E5E7EB]">
              {project.workedHours}h<span className="ml-1 text-sm font-normal text-[#64748B]">{t("hoursLogged")}</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#111C33]">
              <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-xs text-[#94A3B8]">{t("membersAllocated", { count: project.members.length })}</p>
          </div>
        );
      })}
    </div>
  );
}
