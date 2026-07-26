"use client";

import { useTranslations } from "next-intl";

// Client, not server: this is rendered inside LoginForm and RegisterForm,
// which are client components, so getTranslations is unavailable here.
export default function AuthDivider() {
  const t = useTranslations("auth");
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-xs uppercase tracking-[0.16em] text-[#6B7280]">{t("or")}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}
