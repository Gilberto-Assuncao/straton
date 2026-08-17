import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { quickActions } from "@/lib/mock/dashboard";

const labelKeyByHref: Record<string, string> = {
  "/dashboard/time": "addTimeEntry",
  "/dashboard/employees/new": "quickAddEmployee",
  "/dashboard/projects": "quickCreateProject",
  "/dashboard/timesheets": "quickReviewTimesheets",
};

export default async function QuickActions() {
  const t = await getTranslations("dashboard");
  return (
    <section aria-labelledby="quick-actions-title" className="rounded-2xl border border-edge-10 bg-surface p-5 sm:p-6">
      <h3 id="quick-actions-title" className="text-lg font-semibold text-ink">{t("quickActionsTitle")}</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="flex min-h-11 items-center justify-between rounded-lg border border-edge-10 bg-surface-alt/70 px-4 text-sm font-medium text-ink-soft transition hover:border-brand/40 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
            <span>{t(labelKeyByHref[action.href] ?? "addTimeEntry")}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
