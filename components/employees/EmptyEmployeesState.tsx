"use client";

import { useTranslations } from "next-intl";

export default function EmptyEmployeesState({ filtered = false }: { filtered?: boolean }) {
  const t = useTranslations("employees");
  return <div className="rounded-2xl border border-dashed border-edge-15 bg-surface px-5 py-14 text-center"><div aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-xl text-brand-bright">♙</div><h3 className="mt-4 font-semibold text-ink">{filtered ? t("noneFilteredTitle") : t("noneTitle")}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">{filtered ? t("noneFilteredDescription") : t("noneDescription")}</p></div>;
}
