"use client";

import { useTranslations } from "next-intl";

export default function TimesheetEmptyState() { const t = useTranslations("timesheets"); return <div className="rounded-2xl border border-dashed border-white/15 bg-surface/50 px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand-bright" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 3h8m-7 4h6m-8 4h10m-10 4h7M6 3h12a1 1 0 0 1 1 1v16l-3-2-3 2-3-2-3 2-2-1.3V4a1 1 0 0 1 1-1Z" /></svg></div><p className="mt-4 font-semibold text-ink">{t("emptyTitle")}</p><p className="mt-1 text-sm text-ink-muted">{t("emptyDescription")}</p></div>; }
