import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { MembersTable } from "./MembersTable";
import { TeamsOverview } from "./TeamsOverview";
import { WorkforceStats } from "./WorkforceStats";
import type { WorkforceMemberView, WorkforceTeamView } from "../types";

/**
 * A read-only view of who works here (#45).
 *
 * "Add member" used to open a form that told you what it was — "demo form, no
 * account will be created and no invitation sent" — and then discarded eight
 * filled-in fields on submit. Wiring it up would have built a second way to
 * invite somebody, when the first one already works: People → Add, which
 * creates the auth user, sends the email and opens the membership.
 *
 * So the button now goes there. One invitation path, on the screen that owns
 * it, rather than two where one is a prop.
 */
export async function WorkforceOverview({ members, teams }: { members: WorkforceMemberView[]; teams: WorkforceTeamView[] }) {
  const t = await getTranslations("workforce");

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand">{t("eyebrow")}</p>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{t("title")}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{t("description")}</p>
        </div>
        <Link
          href="/dashboard/employees/new"
          className="flex min-h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {t("addMember")}
        </Link>
      </header>

      <WorkforceStats members={members} teams={teams} />
      <MembersTable members={members} teams={teams} />
      <TeamsOverview teams={teams} />
    </div>
  );
}
