import type { Metadata } from "next";
import QuickClock from "@/components/time/QuickClock";
import { getOpenSession, getTimeTrackingOverview } from "@/src/features/time-tracking/data";

export const metadata: Metadata = { title: "Ponto" };

/**
 * The clock-in link, on its own (#31).
 *
 * Deliberately outside the dashboard layout: no sidebar, no company switcher,
 * nothing to navigate. Somebody standing on a site with one hand free opens a
 * link and presses one button. Every other screen in the product assumes a
 * desk; this one does not.
 *
 * Saved to a phone's home screen it behaves like the app we do not have yet.
 */
export default async function ClockPage() {
  const [{ sites, currentAssignment, tasks, todaySummary }, openSession] = await Promise.all([
    getTimeTrackingOverview(),
    getOpenSession(),
  ]);

  return (
    <QuickClock
      openSession={openSession}
      currentAssignment={currentAssignment}
      sites={sites}
      tasks={tasks}
      todayMinutes={todaySummary.workedMinutes}
    />
  );
}
