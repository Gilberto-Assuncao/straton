"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/src/infrastructure/supabase/client";
import { hasPublicEnvironment } from "@/src/infrastructure/config/env";

/**
 * Google and Microsoft only, deliberately (#15).
 *
 * Microsoft matters most here: Belgian construction and services companies run
 * on Microsoft 365, so "continue with Microsoft" is the account they already
 * have. Apple Sign In is not offered — it needs a paid developer account, a
 * Services ID, a signed key and domain verification, and this is a B2B tool
 * used from a work account, not a personal Apple ID.
 *
 * A provider listed here without being enabled in Supabase is a button that
 * fails, so this list and that dashboard have to agree.
 */
const PROVIDERS = [
  { name: "Google", mark: "G", provider: "google" },
  { name: "Microsoft", mark: "⊞", provider: "azure" },
] as const;

export default function SocialAuthButtons() {
  const t = useTranslations("auth");
  const [pending, setPending] = useState<Provider | null>(null);
  const [failure, setFailure] = useState<{ key: "socialFailed" | "socialNotEnabled"; provider: string } | null>(null);
  const configured = hasPublicEnvironment();

  async function continueWith(provider: Provider, name: string) {
    setPending(provider);
    setFailure(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // No locale prefix: the proxy rewrites this onto the active locale, and
        // hardcoding one here would send a Dutch user through the Portuguese
        // route. Verified against production.
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });

    if (!error) return; // The browser is navigating away to the provider.

    /**
     * This branch used to be `if (error) setPending(null)` — the spinner
     * stopped and nothing else happened. With no provider enabled in Supabase,
     * that is what every click did: silence, no message, nothing in any log.
     *
     * Supabase answers a disabled provider with "provider is not enabled",
     * which is worth telling apart: it is a configuration gap, not something
     * the user can fix by trying again.
     */
    const notEnabled = /not enabled|unsupported provider/i.test(error.message);
    setFailure({ key: notEnabled ? "socialNotEnabled" : "socialFailed", provider: name });
    setPending(null);

    // Client-side, so this lands in the browser console rather than the Vercel
    // logs — the server-side capture from #27 does not reach here. Still worth
    // writing: it is the difference between a support call with a screenshot
    // and one without.
    console.error(JSON.stringify({ level: "error", event: "social_signin_failed", provider, detail: error.message }));
  }

  return (
    <div className="grid gap-3">
      {PROVIDERS.map(({ name, mark, provider }) => (
        <button
          key={name}
          type="button"
          onClick={() => continueWith(provider, name)}
          disabled={!configured || pending !== null}
          className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-[#111827] px-4 py-3 text-sm font-semibold text-[#E5E7EB] transition hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center font-bold text-[#E5E7EB]">
            {mark}
          </span>
          {pending === provider ? t("connecting") : t("continueWith", { provider: name })}
        </button>
      ))}

      {failure ? (
        <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-center text-xs text-amber-200">
          {t(failure.key, { provider: failure.provider })}
        </p>
      ) : null}

      {!configured ? (
        <p role="status" className="text-center text-xs text-[#9CA3AF]">
          {t("socialUnavailable")}
        </p>
      ) : null}
    </div>
  );
}
