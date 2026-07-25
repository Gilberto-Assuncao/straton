import { getTranslations } from "next-intl/server";
import type { TimesheetStatus } from "@/lib/types/dashboard";

const styles: Record<TimesheetStatus, string> = { Approved: "bg-[#22C55E]/10 text-[#4ADE80]", Pending: "bg-amber-400/10 text-amber-300", Rejected: "bg-red-400/10 text-red-300" };
const labelKeys = { Approved: "statusApproved", Pending: "statusPending", Rejected: "statusRejected" } as const;

export default async function StatusBadge({ status }: { status: TimesheetStatus }) {
  const t = await getTranslations("dashboard");
  return <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${styles[status]}`}>{t(labelKeys[status])}</span>;
}
