import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import AvailabilityForm from "@/components/availability/AvailabilityForm";
import AvailabilityList from "@/components/availability/AvailabilityList";
import { getAvailability, getSchedulablePeople } from "@/src/features/availability/data";

export const metadata: Metadata = { title: "Availability" };

export default async function AvailabilityPage() {
  const [view, people, t] = await Promise.all([
    getAvailability(),
    getSchedulablePeople(),
    getTranslations("availability"),
  ]);

  return (
    <section aria-labelledby="availability-heading">
      <PageHeader
        headingId="availability-heading"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:items-start">
        <AvailabilityForm people={people} myMembershipId={view.myMembershipId} isManager={view.isManager} />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">{t("listTitle")}</h2>
          <div className="mt-4">
            <AvailabilityList records={view.records} />
          </div>
        </div>
      </div>
    </section>
  );
}
