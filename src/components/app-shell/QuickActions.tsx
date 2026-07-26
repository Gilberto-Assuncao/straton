"use client";
import { useTranslations } from "next-intl";
import Link from "next/link"; import { Icon } from "@/src/components/ui"; import type { QuickAction } from "./types";
export function QuickActions({ actions }: { actions:QuickAction[] }) {
  const tShell = useTranslations("appShell");
  return <div><h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">{tShell("quickActions")}</h2><ul className="mt-2 grid gap-1">{actions.map(action=><li key={action.id}><Link href={action.href} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-[#D1D5DB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]">{action.icon?<Icon name={action.icon}/>:null}{action.label}</Link></li>)}</ul></div>; }
