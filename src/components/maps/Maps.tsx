import type { ReactNode } from "react"; import { Icon } from "@/src/components/ui";
export function MapContainer({ label, children }: { label:string; children?:ReactNode }) { return <div role="region" aria-label={label} className="relative grid min-h-64 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[#1F2937] p-5"><div className="absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(#9CA3AF 1px,transparent 1px),linear-gradient(90deg,#9CA3AF 1px,transparent 1px)",backgroundSize:"2rem 2rem"}}/><div className="relative text-center text-sm text-[#9CA3AF]">{children??"Map integration placeholder"}</div></div>; }
export function LocationCard({ name, address, action }: { name:string; address:string; action?:ReactNode }) { return <article className="rounded-xl border border-white/10 bg-[#161A34] p-4"><div className="flex gap-3"><Icon name="location"/><div><h3 className="font-semibold text-[#E5E7EB]">{name}</h3><p className="mt-1 text-sm text-[#9CA3AF]">{address}</p></div></div>{action?<div className="mt-4">{action}</div>:null}</article>; }
/**
 * Says a position was recorded, not what it was.
 *
 * The pair of decimals it used to print was unreadable to everyone who saw it.
 * The coordinates are still stored — the map and the weather need them — they
 * are simply not something a person is asked to parse.
 */
export function SiteMarker({ label }: { label:string }) { return <span role="img" aria-label={label} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#22C55E] text-[#07110B] shadow-lg"><Icon name="location"/></span>; }
