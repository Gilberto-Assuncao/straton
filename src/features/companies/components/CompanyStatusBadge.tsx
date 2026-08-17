"use client";
import { useTranslations } from "next-intl";
import type { ManagedCompanyStatus } from "../types";

const styles: Record<ManagedCompanyStatus, string> = {
  active: "border-green-400/30 bg-green-400/10 text-success",
  inactive: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  suspended: "border-amber-400/30 bg-amber-400/10 text-warning-soft",
  archived: "border-purple-400/30 bg-purple-400/10 text-purple-200",
};

export function CompanyStatusBadge({ status }: { status: ManagedCompanyStatus }) {
  const t = useTranslations("companies");
  return (
    // `capitalize` went with the raw value: English typography on an English
    // identifier, which mangles other languages once the value is translated.
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      <span aria-hidden="true" className="mr-1.5">
        ●
      </span>
      {t(`status_${status}` as "status_active")}
    </span>
  );
}
