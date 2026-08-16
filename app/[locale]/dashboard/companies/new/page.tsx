import type { Metadata } from "next";
import { DashboardCard } from "@/src/components/dashboard";
import { CompanyDetailsForm } from "@/src/features/companies";
export const metadata: Metadata={title:"Create company"};
export default function NewCompanyPage(){return <div className="mx-auto max-w-5xl space-y-6"><header><p className="text-sm font-semibold text-brand">Company Management</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Create a company</h1><p className="mt-2 text-sm text-ink-muted">Creation is transactional: the workspace and your owner membership are created together.</p></header><DashboardCard title="Company profile" description="Required fields establish the tenant’s localization defaults."><CompanyDetailsForm/></DashboardCard></div>;}
