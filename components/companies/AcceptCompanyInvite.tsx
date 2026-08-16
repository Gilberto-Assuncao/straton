"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  acceptCompanyInviteAction,
  previewCompanyInviteAction,
  type InvitePreview,
} from "@/src/features/partners/invite-actions";

const field =
  "min-h-11 w-full rounded-lg border border-white/15 bg-surface-inset px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand";
const labelText = "text-xs text-ink-muted";

/**
 * The invitee's side of the handshake.
 *
 * The token arrives in the query string, so the server could read it — but the
 * *session* arrives in the URL fragment, which never leaves the browser. Until
 * the Supabase client has consumed that fragment there is nobody logged in, and
 * both the preview and the accept run as the authenticated invitee. So the
 * fetching happens here, after hydration, rather than on the server.
 */
export default function AcceptCompanyInvite({ token }: { token: string | null }) {
  const t = useTranslations("companyInvites");
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    previewCompanyInviteAction(token)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await acceptCompanyInviteAction(formData);
      if (result.ok) {
        router.push("/dashboard");
        return;
      }
      setError(result.message);
    });
  }

  if (loading) return <p className="text-sm text-ink-muted">{t("loading")}</p>;

  // One message for a missing, wrong, spent or expired token. Telling them
  // apart would let someone probe which tokens once existed.
  if (!token || !preview) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface p-6">
        <h1 className="text-lg font-semibold text-ink">{t("invalidTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t("invalidBody")}</p>
      </div>
    );
  }

  return (
    <form action={submit} className="rounded-2xl border border-white/10 bg-surface p-6">
      <input type="hidden" name="token" value={token} />

      <h1 className="text-lg font-semibold text-ink">
        {t("acceptTitle", { inviter: preview.inviterName })}
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        {t("acceptBody", {
          inviter: preview.inviterName,
          type: t(`type_${preview.relationshipType}` as "type_subcontractor"),
        })}
      </p>
      {preview.note ? <p className="mt-3 rounded-lg bg-surface-inset p-3 text-sm text-ink-soft">{preview.note}</p> : null}

      {/* Prefilled from what the inviter looked up, and every field editable:
          they know their own company better than the register does. */}
      <div className="mt-6 grid gap-4">
        <label className="grid gap-1.5">
          <span className={labelText}>{t("companyNameLabel")}</span>
          <input name="companyName" defaultValue={preview.companyName} required minLength={2} className={field} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelText}>{t("registrationLabel")}</span>
            <input name="registrationNumber" defaultValue={preview.registrationNumber ?? ""} className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelText}>{t("vatLabel")}</span>
            <input name="vatNumber" defaultValue={preview.vatNumber ?? ""} className={field} />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={labelText}>{t("addressLabel")}</span>
          <input name="addressLine1" className={field} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className={labelText}>{t("postalCodeLabel")}</span>
            <input name="postalCode" defaultValue={preview.postalCode ?? ""} className={field} />
          </label>
          <label className="grid gap-1.5">
            <span className={labelText}>{t("cityLabel")}</span>
            <input name="city" defaultValue={preview.city ?? ""} className={field} />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={labelText}>{t("jobTitleLabel")}</span>
          <input name="jobTitle" className={field} />
          <span className="text-xs text-ink-subtle">{t("ownerHint")}</span>
        </label>
      </div>

      {error ? (
        <p role="status" className="mt-4 text-sm text-red-300">
          {t(`accept_${error}` as "accept_invalid")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 min-h-11 w-full rounded-lg bg-brand px-5 text-sm font-semibold text-[#06121F] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
      >
        {pending ? t("accepting") : t("accept")}
      </button>
    </form>
  );
}
