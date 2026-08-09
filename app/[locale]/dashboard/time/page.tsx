import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import TimeTracker from "@/components/time/TimeTracker";
import { getOpenSession, getTimeTrackingOverview } from "@/src/features/time-tracking/data";

export const metadata: Metadata = { title: "Time Tracking" };

export default async function TimeTrackingPage() {
  const [{ projects, tasks, sites, currentAssignment, recentEntries, todaySummary, weeklySummary }, openSession, t] = await Promise.all([
    getTimeTrackingOverview(),
    getOpenSession(),
    getTranslations("time"),
  ]);
  return (
    <section aria-labelledby="time-tracking-heading">
      <PageHeader
        headingId="time-tracking-heading"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <div className="mt-8">
        <TimeTracker
          sites={sites}
          currentAssignment={currentAssignment}
          projects={projects}
          tasks={tasks}
          openSession={openSession}
          entries={recentEntries}
          todaySummary={todaySummary}
          weeklySummary={weeklySummary}
        />
      </div>
    </section>
  );
}
