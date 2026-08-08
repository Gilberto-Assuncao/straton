import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import TimeTracker from "@/components/time/TimeTracker";
import { getTimeTrackingOverview } from "@/src/features/time-tracking/data";
import { getLocationConsent } from "@/src/features/account/data";

export const metadata: Metadata = { title: "Time Tracking" };

export default async function TimeTrackingPage() {
  const [{ projects, tasks, sites, currentAssignment, recentEntries, todaySummary, weeklySummary }, locationConsent, t] = await Promise.all([
    getTimeTrackingOverview(),
    getLocationConsent(),
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
          entries={recentEntries}
          todaySummary={todaySummary}
          weeklySummary={weeklySummary}
          locationConsent={locationConsent}
        />
      </div>
    </section>
  );
}
