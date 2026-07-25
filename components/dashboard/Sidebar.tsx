import Link from "next/link";
import DashboardNav from "./DashboardNav";
import { requireAuthenticatedSession } from "@/src/application/session/server";

function formatRole(role: string | undefined): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";
}

export default async function Sidebar() {
  const { user, activeCompany } = await requireAuthenticatedSession();
  const role = formatRole(activeCompany?.roles[0]);

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#161A34] lg:fixed lg:inset-y-0 lg:left-0 lg:flex">
      <Link href="/dashboard" className="flex h-20 items-center px-6 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#22C55E]">
        <span className="text-xl font-bold tracking-[0.16em] text-[#E5E7EB]">STRATON</span>
      </Link>
      <DashboardNav />
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-[#111827] p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/15 text-sm font-bold text-[#22C55E]">{user.initials}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#E5E7EB]">{user.name}</p><p className="truncate text-xs text-[#9CA3AF]">{role}</p></div>
        </div>
        <button type="button" className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium text-[#9CA3AF] transition hover:bg-white/5 hover:text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]">Sign Out</button>
      </div>
    </aside>
  );
}
