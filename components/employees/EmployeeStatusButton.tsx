"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { EmployeeMessageKey } from "@/src/features/employees/messages";
import { setEmployeeActiveAction } from "@/src/features/employees/actions";
import type { EmployeeStatus } from "@/lib/types/employee";

// Deactivating is reversible but disruptive — it closes the person's team link
// — so it always asks first. Reactivating does not.
export default function EmployeeStatusButton({ employeeId, status, className }: { employeeId: string; status: EmployeeStatus; className?: string }) {
  const t = useTranslations("employees");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<EmployeeMessageKey | null>(null);
  const isActive = status !== "inactive";

  function run() {
    if (isActive && !window.confirm(t("deactivateConfirm"))) return;
    setError(null);
    startTransition(async () => {
      const result = await setEmployeeActiveAction(employeeId, !isActive);
      if (!result.ok) setError(result.messageKey);
      else router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={className ?? `min-h-11 px-2 font-semibold disabled:opacity-50 focus-visible:outline-2 ${isActive ? "text-red-300 focus-visible:outline-red-300" : "text-brand-bright focus-visible:outline-brand-bright"}`}
      >
        {pending ? t("saving") : isActive ? t("deactivate") : t("reactivate")}
      </button>
      {error ? <span role="alert" className="block text-xs text-red-300">{t(error)}</span> : null}
    </>
  );
}
