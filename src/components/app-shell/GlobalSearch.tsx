"use client";
import { useTranslations } from "next-intl";
import { useState } from "react"; import { Icon } from "@/src/components/ui";
export function GlobalSearch() {
  const tShell = useTranslations("appShell");
  const [query,setQuery]=useState(""); return <div className="relative w-full max-w-xl"><Icon name="search" className="pointer-events-none absolute left-3 top-3 text-ink-subtle"/><label htmlFor="global-search" className="sr-only">{tShell("globalSearch")}</label><input id="global-search" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={tShell("searchPlaceholder")} className="min-h-11 w-full rounded-lg border border-edge-10 bg-surface-alt pl-10 pr-16 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"/><kbd className="pointer-events-none absolute right-3 top-3 rounded border border-edge-10 px-1.5 text-xs text-ink-muted">Ctrl K</kbd></div>; }
