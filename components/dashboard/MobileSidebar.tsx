"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import DashboardNav from "./DashboardNav";
import { useSessionContext } from "@/src/application/session/session-provider";

type MobileSidebarProps = { open: boolean; onClose: () => void };

function formatRole(role: string | undefined): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";
}

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const session = useSessionContext();

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Close navigation" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <aside id="mobile-dashboard-navigation" role="dialog" aria-modal="true" aria-label="Mobile navigation" className="relative flex h-full w-[min(18rem,88vw)] flex-col border-r border-white/10 bg-[#161A34] shadow-2xl">
        <div className="flex h-20 items-center justify-between px-5">
          <Link href="/dashboard" onClick={onClose} className="text-xl font-bold tracking-[0.16em] text-[#E5E7EB]">STRATON</Link>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white/5 hover:text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]" aria-label="Close menu"><span aria-hidden="true" className="text-2xl">×</span></button>
        </div>
        <DashboardNav />
        <div className="border-t border-white/10 p-4 text-sm"><p className="font-semibold text-[#E5E7EB]">{session?.user.name ?? ""}</p><p className="mt-1 text-xs text-[#9CA3AF]">{formatRole(session?.activeCompany?.roles[0])}</p><button type="button" className="mt-3 min-h-11 w-full rounded-lg border border-white/10 text-[#9CA3AF] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">Sign Out</button></div>
      </aside>
    </div>
  );
}
