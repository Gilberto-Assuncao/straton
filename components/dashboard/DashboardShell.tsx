import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/src/components/app-shell/AppShell";
import { defaultAppNavigation } from "@/src/components/app-shell/config";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import { SessionProvider } from "@/src/application/session/session-provider";
import { getNotifications } from "@/src/features/notifications/data";
import { getExcessShiftsCount, getPendingApprovalsCount } from "@/src/features/dashboard/data";

export default async function DashboardShell({ children }: { children: ReactNode }) {
  const [session, notifications, pendingApprovals, excessShifts] = await Promise.all([requireAuthenticatedSession(), getNotifications(), getPendingApprovalsCount(), getExcessShiftsCount()]);
  const t = await getTranslations("nav");
  const roles = session.activeCompany?.roles ?? [];
  const navigation = defaultAppNavigation
    .filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)))
    .map((item) => ({
      ...item,
      label: t(item.id as Parameters<typeof t>[0]),
      badge: item.badge === "approvals" ? (pendingApprovals > 0 ? String(pendingApprovals) : undefined)
        : item.badge === "divergences" ? (excessShifts > 0 ? String(excessShifts) : undefined)
        : item.badge,
    }));
  return (
    <SessionProvider value={session}>
      <AppShell navigation={navigation} breadcrumbs={[{ label: t("dashboard"), href: "/dashboard" }]} companies={session.companies.filter(({ status }) => status !== "archived").map(({ id, name }) => ({ id, name }))} currentCompany={session.activeCompany?.id} user={session.user} notifications={notifications}>
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </AppShell>
    </SessionProvider>
  );
}
