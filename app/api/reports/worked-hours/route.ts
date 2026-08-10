import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { getWorkedHoursReport, parseSiteFilter, toCsv } from "@/src/features/reports/worked-hours";

/**
 * The worked-hours report as a CSV (#9).
 *
 * The accountant needs a file, not a screen. Nothing here checks who is asking:
 * `getWorkedHoursReport` goes through `requireActiveCompany` and the aggregation
 * functions are `security invoker`, so an unauthenticated request produces no
 * rows rather than someone else's payroll.
 */
export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const siteIds = parseSiteFilter(request.nextUrl.searchParams.get("sites") ?? undefined);

  const report = await getWorkedHoursReport(month, siteIds);
  // Column headings in the reader's language, like the screen they came from.
  const t = await getTranslations("reports");

  const csv = toCsv(report, {
    person: t("csvPerson"),
    jobTitle: t("csvJobTitle"),
    approvedHours: t("csvApprovedHours"),
    submittedHours: t("csvSubmittedHours"),
    draftHours: t("csvDraftHours"),
    approvedMinutes: t("csvApprovedMinutes"),
    entries: t("csvEntries"),
  });

  // The byte-order mark is what makes Excel read a UTF-8 CSV as UTF-8 instead
  // of mangling "Almeida" into "AlmeidaÂ". Three bytes, and without them the
  // first accented name in the file makes the whole export look broken.
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // The filename says when it is filtered (#77). The rows themselves cannot
      // carry that warning: a preamble line above the headers shifts every
      // column and breaks the spreadsheet the file exists to feed. So the scope
      // travels in the one place a downloaded file keeps — its name — and the
      // accountant does not sum three locations believing they had eleven.
      "Content-Disposition": `attachment; filename="straton-hours-${report.month}${
        report.siteIds.length ? `-${report.siteIds.length}-locations` : ""
      }.csv"`,
      // Payroll figures change as approvals come in; a cached copy of last
      // week's answer is worse than a slow one.
      "Cache-Control": "no-store",
    },
  });
}
