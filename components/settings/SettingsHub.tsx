import Link from "next/link";
import type { ReactNode } from "react";

export interface SettingsHubCard {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}

function ClientsIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>; }
function SitesIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.6" /></svg>; }
function TemplatesIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>; }
function LanguagesIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18M3 12h18" /></svg>; }
function PermissionsIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></svg>; }
function ComplianceIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" /><path d="M9 12l2 2 4-4" /></svg>; }

export const settingsIcons = { clients: <ClientsIcon />, sites: <SitesIcon />, templates: <TemplatesIcon />, languages: <LanguagesIcon />, permissions: <PermissionsIcon />, compliance: <ComplianceIcon /> };

export default function SettingsHub({ cards }: { cards: SettingsHubCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.key} className="rounded-2xl border border-edge-10 bg-surface p-6">
          <div className="mb-3.5">{card.icon}</div>
          <div className="mb-2 text-base font-semibold text-ink">{card.title}</div>
          <p className="mb-3.5 text-[13px] text-ink-dim">{card.description}</p>
          {card.href ? (
            <Link href={card.href} className="text-sm font-semibold text-brand-bright hover:text-brand">{card.linkLabel} →</Link>
          ) : (
            <span className="text-sm font-semibold text-ink-faint">{card.linkLabel}</span>
          )}
        </div>
      ))}
    </div>
  );
}
