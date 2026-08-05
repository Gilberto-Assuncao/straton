import type { Metadata } from "next";
import Link from "next/link";
import { CompaniesList, listCompanies } from "@/src/features/companies";
import PartnersPanel from "@/components/companies/PartnersPanel";
import { getCompanyPartners } from "@/src/features/partners/data";
export const metadata: Metadata={title:"Companies"};
export default async function CompaniesPage(){const [companies,partners]=await Promise.all([listCompanies(),getCompanyPartners()]);return <div className="space-y-6"><header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-[#22C55E]">Sprint 3.8 · Company Management</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Companies</h1><p className="mt-2 text-sm text-[#9CA3AF]">Authorized tenant workspaces linked to your account.</p></div><div className="flex flex-wrap gap-3"><Link href="/dashboard/companies/network" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-4 font-semibold text-[#E5E7EB] hover:bg-white/5">Network</Link><Link href="/dashboard/companies/new" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#22C55E] px-4 font-semibold text-[#07110B]">Create company</Link></div></header><CompaniesList companies={companies}/><PartnersPanel relationships={partners}/></div>;}
