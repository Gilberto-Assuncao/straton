"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { endSupportSessionAction } from "@/src/features/support/actions";

/**
 * The banner that makes support access impossible to forget (#19).
 *
 * Loud on purpose, and at the top of every support screen. The failure this
 * prevents is not technical: it is somebody spending twenty minutes looking at
 * a customer's payroll while believing they are looking at their own company's.
 *
 * It says read-only because that is the whole truth of this mode — there is no
 * write path at all, not a disabled one.
 */
export default function SupportBanner({
  companyName,
  expiresAtLabel,
}: {
  companyName: string;
  expiresAtLabel: string;
}) {
  const t = useTranslations("support");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-warning">{t("bannerTitle", { company: companyName })}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{t("bannerDetail", { time: expiresAtLabel })}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await endSupportSessionAction();
            // Away from the customer's data, not merely out of the session.
            // Revalidating in place would leave this screen rendered until
            // something else navigated — twenty minutes of somebody reading a
            // company they no longer have a session on is the exact failure the
            // banner above exists to prevent.
            router.replace("/dashboard/support");
          })
        }
        className="min-h-11 shrink-0 rounded-lg border border-edge-15 px-4 text-sm font-semibold text-ink hover:bg-edge-5 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-brand"
      >
        {t("endSession")}
      </button>
    </div>
  );
}
