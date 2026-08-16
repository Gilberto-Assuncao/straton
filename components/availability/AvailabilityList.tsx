"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteAvailabilityAction } from "@/src/features/availability/actions";
import type { AvailabilityRecord } from "@/src/features/availability/types";

const reasonTone: Record<string, string> = {
  holiday: "bg-brand/10 text-brand-bright",
  sick: "bg-red-400/10 text-red-300",
  training: "bg-sky-400/10 text-sky-300",
  personal: "bg-edge-10 text-ink-muted",
  other: "bg-edge-10 text-ink-muted",
};

function day(iso: string): string {
  return iso.slice(0, 10);
}

export default function AvailabilityList({ records }: { records: AvailabilityRecord[] }) {
  const t = useTranslations("availability");
  const [removed, setRemoved] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const visible = records.filter((record) => !removed.includes(record.id));

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteAvailabilityAction(id);
      if (result.status === "success") setRemoved((current) => [...current, id]);
    });
  }

  if (visible.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-edge-15 px-4 py-10 text-center text-sm text-ink-subtle">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-edge-10 rounded-2xl border border-edge-10 bg-surface">
      {visible.map((record) => (
        <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{record.personName}</p>
            <p className="mt-1 text-xs text-ink-subtle">
              {day(record.startsAt)} → {day(record.endsAt)}
              {/* Null for colleagues by design — the range is what scheduling
                  needs; why someone is away is not everyone's business. */}
              {record.note ? ` · ${record.note}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${
                record.kind === "available" ? "bg-sky-400/10 text-sky-300" : reasonTone[record.reason ?? "other"]
              }`}
            >
              {record.kind === "available"
                ? t("kind_available")
                : t(`reason_${record.reason ?? "other"}` as "reason_holiday")}
            </span>
            {record.canManage ? (
              <button
                type="button"
                onClick={() => remove(record.id)}
                disabled={pending}
                className="min-h-11 rounded-lg border border-edge-15 px-4 text-xs font-semibold text-ink hover:bg-edge-5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand-bright"
              >
                {t("remove")}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
