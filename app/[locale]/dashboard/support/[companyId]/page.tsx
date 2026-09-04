import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import SupportBanner from "@/components/support/SupportBanner";
import { getSupportOverview, getSupportSession } from "@/src/features/support/data";

export const metadata: Metadata = { title: "Support" };

export default async function SupportCompanyPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;

  // The session is checked against the company in the URL, not trusted from it.
  // A valid session for another company is refused here, which is the one thing
  // somebody would try.
  const session = await getSupportSession(companyId);
  if (!session) notFound();

  const [overview, t, format] = await Promise.all([
    getSupportOverview(companyId),
    getTranslations("support"),
    getFormatter(),
  ]);
  if (!overview) notFound();

  const stat = "rounded-2xl border border-edge-10 bg-surface p-5";

  return (
    <section aria-labelledby="support-company-heading">
      <SupportBanner
        companyName={session.companyName}
        expiresAtLabel={format.dateTime(new Date(session.expiresAt), { timeStyle: "short" })}
      />

      <PageHeader
        headingId="support-company-heading"
        eyebrow={t("eyebrow")}
        title={session.companyName}
        description={t("companyDescription")}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className={stat}>
          <p className="text-xs uppercase tracking-wide text-ink-subtle">{t("statClockedIn")}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{overview.openSessions}</p>
        </div>
        <div className={stat}>
          <p className="text-xs uppercase tracking-wide text-ink-subtle">{t("statPending")}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{overview.pendingTimesheets}</p>
        </div>
        <div className={stat}>
          <p className="text-xs uppercase tracking-wide text-ink-subtle">{t("statHours")}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{overview.hoursThisWeek}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-ink">{t("peopleHeading")}</h2>
          <ul className="mt-3 grid gap-2">
            {overview.people.map((person) => (
              <li key={person.email} className="rounded-xl border border-edge-10 bg-surface px-4 py-3">
                <p className="text-sm font-medium text-ink">{person.name}</p>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  {[person.jobTitle, person.status].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
            {overview.people.length === 0 ? <li className="text-sm text-ink-muted">{t("noPeople")}</li> : null}
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold text-ink">{t("sitesHeading")}</h2>
          <ul className="mt-3 grid gap-2">
            {overview.sites.map((site) => (
              <li key={site.id} className="rounded-xl border border-edge-10 bg-surface px-4 py-3">
                <p className="text-sm font-medium text-ink">{site.name}</p>
                <p className="mt-0.5 text-xs text-ink-subtle">
                  {[site.city, site.status].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
            {overview.sites.length === 0 ? <li className="text-sm text-ink-muted">{t("noSites")}</li> : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
