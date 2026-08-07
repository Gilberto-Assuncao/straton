"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/src/components/ui";
import { ConfirmationDialog } from "@/src/components/feedback";
import { setCompanyArchivedAction } from "../actions";
import type { CompanyMessageKey, ManagedCompanyStatus } from "../types";

export function CompanyDangerZone({
  companyId,
  status,
  canArchive,
  canReactivate,
}: {
  companyId: string;
  status: ManagedCompanyStatus;
  canArchive: boolean;
  canReactivate: boolean;
}) {
  const t = useTranslations("companies");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [messageKey, setMessageKey] = useState<CompanyMessageKey | null>(null);

  const archived = status === "archived";

  function confirm() {
    startTransition(async () => {
      const result = await setCompanyArchivedAction(companyId, !archived);
      setMessageKey(result.messageKey);
      setOpen(false);
      if (result.ok) {
        // Archiving removes the company from the switcher, so staying on its
        // page would leave the user looking at something they can no longer act
        // on.
        if (archived) router.refresh();
        else router.push("/dashboard/companies");
      }
    });
  }

  if ((!archived && !canArchive) || (archived && !canReactivate)) return null;

  return (
    <section className="rounded-2xl border border-red-400/30 bg-red-400/5 p-5">
      <h2 className="text-lg font-semibold text-red-100">{t("dangerTitle")}</h2>
      <p className="mt-2 text-sm text-[#D1D5DB]">{archived ? t("dangerReactivateBody") : t("dangerArchiveBody")}</p>

      <div className="mt-4">
        <Button variant={archived ? "outline" : "danger"} loading={pending} onClick={() => setOpen(true)}>
          {archived ? t("reactivateCompany") : t("archiveCompany")}
        </Button>
      </div>

      {messageKey ? (
        <p aria-live="polite" className="mt-3 text-sm text-[#D1D5DB]">
          {t(`message_${messageKey}` as "message_failed")}
        </p>
      ) : null}

      <ConfirmationDialog
        open={open}
        title={archived ? t("reactivateConfirmTitle") : t("archiveConfirmTitle")}
        description={archived ? t("reactivateConfirmBody") : t("archiveConfirmBody")}
        confirmLabel={archived ? t("reactivate") : t("archiveCompany")}
        onConfirm={confirm}
        onClose={() => setOpen(false)}
      />
    </section>
  );
}
