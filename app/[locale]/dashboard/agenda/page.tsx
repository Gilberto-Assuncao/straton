import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import PageHeader from "@/components/dashboard/PageHeader";
import AgendaWeek from "@/components/agenda/AgendaWeek";
import AssignmentForm from "@/components/agenda/AssignmentForm";
import { getAgenda, getAssignmentOptions } from "@/src/features/assignments/data";

export const metadata: Metadata = { title: "Agenda" };

function shiftWeek(weekStart: string, days: number): string {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const [agenda, t] = await Promise.all([getAgenda(week), getTranslations("agenda")]);

  // Only a supervisor is offered the form, and only then are its options
  // fetched — three queries nobody else has any use for.
  const options = agenda.isManager ? await getAssignmentOptions() : null;

  const navLink =
    "flex min-h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-[#E5E7EB] hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]";

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
        <AgendaWeek days={agenda.days} today={agenda.today} />
        {options ? <AssignmentForm options={options} /> : null}
      </div>
    </section>
  );
}
