"use client";
import Link from "next/link"; import { usePathname } from "next/navigation"; import { useTranslations } from "next-intl"; import { Icon, Logo, type IconName } from "@/src/components/ui"; import { Tooltip } from "@/src/components/data-display"; import type { AppNavigationItem } from "./types";
function NavItem({ item, collapsed, depth = 0, onNavigate }: { item:AppNavigationItem; collapsed:boolean; depth?:number; onNavigate?:()=>void }) { const pathname=usePathname(); const active=pathname===item.href||pathname.startsWith(`${item.href}/`); const classes=`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E] ${item.disabled?"cursor-not-allowed text-[#6B7280]":active?"bg-[#22C55E]/10 text-[#22C55E]":"text-[#D1D5DB] hover:bg-white/5 hover:text-[#E5E7EB]"}`; const inner=<>{item.icon?<Icon name={item.icon as IconName}/>:null}<span className={collapsed?"sr-only":"truncate"}>{item.label}</span>{item.disabled&&!collapsed?<span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>:item.badge&&!collapsed?<span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">{item.badge}</span>:null}</>; const content=item.disabled?<span aria-disabled="true" className={classes} style={{paddingLeft:collapsed?undefined:`${0.75+depth}rem`}}>{inner}</span>:<Link href={item.href} onClick={onNavigate} aria-current={active?"page":undefined} className={classes} style={{paddingLeft:collapsed?undefined:`${0.75+depth}rem`}}>{inner}</Link>; if(!item.children?.length)return collapsed?<Tooltip label={item.label}>{content}</Tooltip>:content; return <details open={active} className="group"><summary className="list-none">{collapsed?<Tooltip label={item.label}>{content}</Tooltip>:content}</summary>{!collapsed?<div className="mt-1 grid gap-1">{item.children.map(child=><NavItem key={child.id} item={child} collapsed={false} depth={depth+1} onNavigate={onNavigate}/>)}</div>:null}</details>; }
function groupBySection(navigation: AppNavigationItem[]): { section?: string; items: AppNavigationItem[] }[] {
  const groups: { section?: string; items: AppNavigationItem[] }[] = [];
  for (const item of navigation) {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) last.items.push(item);
    else groups.push({ section: item.section, items: [item] });
  }
  return groups;
}

export function AppSidebar({ navigation, collapsed, mobile, onClose }: { navigation:AppNavigationItem[]; collapsed:boolean; mobile?:boolean; onClose?:()=>void }) {
  const tShell = useTranslations("appShell");
  const t = useTranslations("nav");
  const sectionLabels: Record<string, string> = { general: t("sectionGeneral"), operations: t("sectionOperations"), finance: t("sectionFinance"), company: t("sectionCompany") };
  const groups = groupBySection(navigation);
  return <aside id={mobile?"mobile-app-navigation":undefined} aria-label={tShell("primaryNavigation")} className={`flex h-full flex-col border-r border-white/10 bg-[#111827] transition-[width] ${mobile?"w-[min(20rem,90vw)]":collapsed?"w-20":"w-72"}`}><div className="flex min-h-20 items-center justify-between border-b border-white/10 px-4"><Logo compact={collapsed}/>{mobile?<button type="button" onClick={onClose} aria-label={tShell("closeNavigation")} className="min-h-11 min-w-11 rounded-lg text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]">×</button>:null}</div><nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
    <div className="grid gap-5">
      {groups.map((group, index) => <div key={group.section ?? `section-${index}`}>
        {group.section && !collapsed ? <div className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#6B7280]">{sectionLabels[group.section] ?? group.section}</div> : null}
        <ul className="grid gap-1">{group.items.map(item=><li key={item.id}><NavItem item={item} collapsed={collapsed} onNavigate={onClose}/></li>)}</ul>
      </div>)}
    </div>
  </nav></aside>;
}
