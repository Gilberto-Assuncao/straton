"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/src/components/data-display";
import type { CompanyRole, WorkforceMembershipStatus } from "@/src/domain";

/**
 * Status and role values are translated rather than printed raw.
 *
 * These come out of the database as `suspended` or `contractor` — English
 * identifiers that happened to double as labels. A Dutch company reading
 * "suspended" in a status column is reading a column name, not a status.
 */
export function MemberStatusBadge({ status }: { status: WorkforceMembershipStatus }) {
  const t = useTranslations("workforce");
  const tone = status === "active" ? "success" : status === "invited" ? "info" : status === "suspended" ? "warning" : "neutral";
  return (
    <Badge tone={tone}>
      <span aria-hidden="true">●</span> {t(`status_${status}` as "status_active")}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: CompanyRole }) {
  const t = useTranslations("workforce");
  return <Badge tone={role === "owner" || role === "admin" ? "info" : "neutral"}>{t(`role_${role}` as "role_owner")}</Badge>;
}
