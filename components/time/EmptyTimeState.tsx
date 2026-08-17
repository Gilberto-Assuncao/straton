"use client";

import { useTranslations } from "next-intl";

export default function EmptyTimeState() {
  const t = useTranslations("time");
  return <div className="rounded-xl border border-dashed border-edge-15 px-5 py-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-brand-bright" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg></div><p className="mt-4 text-sm font-semibold text-ink">{t("emptyTitle")}</p><p className="mt-1 text-xs leading-5 text-ink-muted">{t("emptyDescription")}</p></div>;
}
