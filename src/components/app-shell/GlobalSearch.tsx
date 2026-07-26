"use client";
import { useTranslations } from "next-intl";
import { useState } from "react"; import { Icon } from "@/src/components/ui";
export function GlobalSearch() {
  const tShell = useTranslations("appShell");
  const [query,setQuery]=useState(""); return <div className="relative w-full max-w-xl"><Icon name="search" className="pointer-events-none absolute left-3 top-3 text-[#6B7280]"/><label htmlFor="global-search" className="sr-only">{tShell("globalSearch")}</label><input id="global-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={tShell("searchPlaceholder")} className="min-h-11 w-full rounded-lg border border-white/10 bg-[#111827] pl-10 pr-16 text-sm text-[#E5E7EB] outline-none focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/20"/><kbd className="pointer-events-none absolute right-3 top-3 rounded border border-white/10 px-1.5 text-xs text-[#9CA3AF]">Ctrl K</kbd></div>; }
