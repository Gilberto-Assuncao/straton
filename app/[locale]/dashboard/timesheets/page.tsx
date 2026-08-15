import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ApprovalQueue from "@/components/timesheets/ApprovalQueue";
import PageHeader from "@/components/dashboard/PageHeader";
import TimesheetPage from "@/components/timesheets/TimesheetPage";
import { requireActiveCompany } from "@/src/application/session/server";
import { getPendingTimesheets, getTimesheetWorkspace } from "@/src/features/timesheets/data";

export const metadata: Metadata = { title: "Timesheets" };

const managerRoles = ["owner", "admin", "administrator", "manager", "supervisor"];

export default async function TimesheetsPage() {
  const [{ timesheet, employees, locations, weekRanges, taskOptions, siteOptions }, pending, { session }, t] = await Promise.all([
    getTimesheetWorkspace(),
    getPendingTimesheets(),
    requireActiveCompany(),
    getTranslations("timesheets"),
  ]);
  const canReview = session.activeCompany!.roles.some((role) => managerRoles.includes(role));

  return (
    <section aria-labelledby="timesheets-heading">
      <PageHeader headingId="timesheets-heading" eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      {/*
        The queue comes first. It is the only part of this page that changes what
        reaches payroll, and burying it under a filterable table is how a backlog
        of submitted weeks goes unnoticed for a month.
      */}
      <div className="mt-8 grid gap-5">
        <ApprovalQueue pending={pending} canReview={canReview} />
        <TimesheetPage timesheet={timesheet} employees={employees} locations={locations} weekRanges={weekRanges} taskOptions={taskOptions} siteOptions={siteOptions} />
      </div>
    </section>
  );
}
