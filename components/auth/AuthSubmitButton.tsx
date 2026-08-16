"use client";

import { useFormStatus } from "react-dom";

export default function AuthSubmitButton({ children, pendingLabel }: { children: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="min-h-12 w-full rounded-lg bg-brand px-5 py-3 font-semibold text-on-brand transition hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-70">
      {pending ? pendingLabel : children}
    </button>
  );
}
