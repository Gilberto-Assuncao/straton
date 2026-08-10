import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { AppShell } from "@/src/components/app-shell/AppShell";
import { defaultAppNavigation } from "@/src/components/app-shell/config";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import { SessionProvider } from "@/src/application/session/session-provider";
import { getNotifications } from "@/src/features/notifications/data";
import { getExcessShiftsCount, getPendingApprovalsCount } from "@/src/features/dashboard/data";
import { getRecentWorkLocations } from "@/src/features/sites/data";

export default async function DashboardShell({ children }: { children: ReactNode }) {
  const [session, notifications, pendingApprovals, excessShifts, recentLocations] = await Promise.all([requireAuthenticatedSession(), getNotifications(), getPendingApprovalsCount(), getExcessShiftsCount(), getRecentWorkLocations()]);
  const t = await getTranslations("nav");
  const roles = session.activeCompany?.roles ?? [];
  const navigation = defaultAppNavigation
    .filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)))
    .map((item) => ({
      ...item,
      label: t(item.id as Parameters<typeof t>[0]),
      /*
       * The places this person is working, one click away (#76).
       *
       * Hung under the existing menu entry as children rather than built as a
       * new panel: the sidebar already knows how to nest, and a second way of
       * listing things in the same column is a second thing to learn.
       */
      children:
        item.id === "sites" && recentLocations.length
          ? recentLocations.map((location) => ({
              id: `site-${location.id}`,
              label: location.name,
              href: `/dashboard/sites/${location.id}`,
              section: item.section,
            }))
          : item.children,
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
