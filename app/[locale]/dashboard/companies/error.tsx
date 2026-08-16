"use client";
import { Button } from "@/src/components/ui";
export default function CompaniesError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <section role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-6"><h1 className="text-xl font-semibold">Company data could not be loaded</h1><p className="mt-2 text-sm text-ink-soft">Your tenant context remains unchanged. Try loading the page again.</p><Button className="mt-4" variant="outline" onClick={reset}>Try again</Button></section>;}
