"use client";
import { useTranslations } from "next-intl";

import { useState } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/src/infrastructure/supabase/client";
import { hasPublicEnvironment } from "@/src/infrastructure/config/env";

const providers = [
  { name: "Google", mark: "G", provider: "google" },
  { name: "Microsoft", mark: "⊞", provider: "azure" },
] as const;

export default function SocialAuthButtons() {
  const [pending, setPending] = useState<Provider | null>(null);
  const t = useTranslations("auth");
  const configured = hasPublicEnvironment();

  async function continueWith(provider: Provider) {
    setPending(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });
    if (error) setPending(null);
  }

  return (
    <div className="grid gap-3">
      {providers.map(({ name, mark, provider }) => (
        <button key={name} type="button" onClick={() => continueWith(provider)} disabled={!configured || pending !== null} className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-[#111827] px-4 py-3 text-sm font-semibold text-[#E5E7EB] transition hover:border-white/30 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E] disabled:cursor-not-allowed disabled:opacity-60">
          <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center font-bold text-[#E5E7EB]">{mark}</span>
          {pending === provider ? t("connecting") : t("continueWith", { provider: name })}
        </button>
      ))}
      {!configured ? <p role="status" className="text-center text-xs text-[#9CA3AF]">{t("socialUnavailable")}</p> : null}
    </div>
  );
}
