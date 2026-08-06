"use client";
import { useTranslations } from "next-intl";
import type { TeamStatus } from "../types";

const styles: Record<TeamStatus, string> = {
  active: "border-green-400/30 bg-green-400/10 text-green-200",
  inactive: "border-slate-400/30 bg-slate-400/10 text-slate-200",
  archived: "border-purple-400/30 bg-purple-400/10 text-purple-200",
};

export function TeamStatusBadge({ status }: { status: TeamStatus }) {
  const t = useTranslations("teams");
  return (
    // `capitalize` is gone with the raw value: it was English typography
    // applied to an English identifier, and it mangles other languages.
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      <span aria-hidden="true">● </span>
      {t(`status_${status}` as "status_active")}
    </span>
  );
}
