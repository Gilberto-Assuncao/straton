import { requireAuthenticatedSession } from "@/src/application/session/server";

function formatRole(role: string | undefined): string {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";
}

export default async function UserMenu() {
  const { user, activeCompany } = await requireAuthenticatedSession();
  const role = formatRole(activeCompany?.roles[0]);
  const firstName = user.name.split(" ")[0];

  return (
    <details className="group relative">
      <summary aria-label="Open user menu" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-on-brand">{user.initials}</span>
        <span className="hidden text-sm font-medium text-ink sm:block">{firstName}</span>
        <span aria-hidden="true" className="hidden text-ink-muted transition-transform group-open:rotate-180 sm:block">⌄</span>
      </summary>
      <div className="absolute right-0 top-12 z-40 w-52 rounded-xl border border-edge-10 bg-surface p-2 shadow-2xl">
        <div className="border-b border-edge-10 px-3 py-2"><p className="text-sm font-semibold text-ink">{user.name}</p><p className="text-xs text-ink-muted">{role}</p></div>
        <button type="button" className="mt-1 flex min-h-11 w-full items-center rounded-lg px-3 text-sm text-ink-muted hover:bg-edge-5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand">Sign Out</button>
      </div>
    </details>
  );
}
