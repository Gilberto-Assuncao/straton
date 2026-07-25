import type { Metadata } from "next";
import type { ReactNode } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s — STRATON",
  },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
