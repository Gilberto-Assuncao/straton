import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import AgendaWeek from "@/components/agenda/AgendaWeek";
import AssignmentForm from "@/components/agenda/AssignmentForm";
import AgendaSubscription from "@/components/agenda/AgendaSubscription";
import { getAgenda, getAgendaFeedState, getAgendaSwapContext, getAssignmentOptions } from "@/src/features/assignments/data";

export const metadata: Metadata = { title: "Agenda" };

function shiftWeek(weekStart: string, days: number): string {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const [agenda, feed, swaps, t, format] = await Promise.all([
    getAgenda(week),
    getAgendaFeedState(),
    getAgendaSwapContext(),
    getTranslations("agenda"),
    getFormatter(),
  ]);

  // Formatted here rather than in the panel. The panel is a Client Component,
  // and a date formatted on both sides of the boundary is formatted in two
  // different timezones — the server's and the phone's — which React reports as
  // a hydration mismatch and the reader sees as the value changing after load.
  const dateTime = (value: string | null) =>
    value ? format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short" }) : null;

  // Only a supervisor is offered the form, and only then are its options
  // fetched — three queries nobody else has any use for.
  const options = agenda.isManager ? await getAssignmentOptions() : null;

  const navLink =
    "flex min-h-11 items-center rounded-lg border border-edge-15 px-4 text-sm font-semibold text-ink hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <section aria-labelledby="agenda-heading">
      <PageHeader
        headingId="agenda-heading"
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={agenda.ownOnly ? t("descriptionWorker") : t("descriptionManager")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/agenda?week=${shiftWeek(agenda.weekStart, -7)}`} className={navLink}>
              ← {t("previousWeek")}
            </Link>
            <Link href="/dashboard/agenda" className={navLink}>
              {t("thisWeek")}
            </Link>
            <Link href={`/dashboard/agenda?week=${shiftWeek(agenda.weekStart, 7)}`} className={navLink}>
              {t("nextWeek")} →
            </Link>
          </div>
        }
      />

      <div className="mt-8 grid gap-6">
        <AgendaWeek days={agenda.days} today={agenda.today} sites={options?.sites ?? []} swaps={swaps} />
        {options ? <AssignmentForm options={options} /> : null}
        <AgendaSubscription
          state={feed}
          createdAtLabel={dateTime(feed.createdAt)}
          lastFetchedAtLabel={dateTime(feed.lastFetchedAt)}
        />
      </div>
    </section>
  );
}
