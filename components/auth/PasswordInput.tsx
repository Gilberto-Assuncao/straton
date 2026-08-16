"use client";
import { useTranslations } from "next-intl";

import { useState, type FormEventHandler } from "react";

type PasswordInputProps = {
  id: string;
  label: string;
  name: string;
  autoComplete: string;
  placeholder?: string;
  /**
   * Editing the password also retires the message above the form (#74).
   *
   * The value itself is never echoed back — see `AuthFormValues` — but a
   * refusal about the password stops describing anything the moment the
   * password changes, exactly like the other fields.
   */
  onInput?: FormEventHandler<HTMLInputElement>;
};

export default function PasswordInput({ id, label, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("auth");

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          {...props}
          className="min-h-12 w-full rounded-lg border border-edge-15 bg-surface-alt py-3 pl-4 pr-14 text-base text-ink outline-none transition placeholder:text-ink-subtle hover:border-edge-25 focus:border-brand focus:ring-2 focus:ring-brand/20 user-invalid:border-red-400 user-invalid:ring-2 user-invalid:ring-red-400/15"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t("hidePassword", { label: label.toLowerCase() }) : t("showPassword", { label: label.toLowerCase() })}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition hover:bg-edge-5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-bright"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
            {visible ? <><path d="M3 3l18 18" /><path d="M10.6 10.6A2 2 0 0 0 13.4 13.4M9.9 4.3A10.6 10.6 0 0 1 12 4c5.5 0 9 8 9 8a16 16 0 0 1-2.2 3.2M6.6 6.6C4.4 8.1 3 12 3 12s3.5 8 9 8a9.7 9.7 0 0 0 4.1-.9" /></> : <><path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8Z" /><circle cx="12" cy="12" r="2.5" /></>}
          </svg>
        </button>
      </div>
    </div>
  );
}
