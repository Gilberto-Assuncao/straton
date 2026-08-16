import type { ComponentPropsWithoutRef } from "react";

type AuthInputProps = ComponentPropsWithoutRef<"input"> & {
  label: string;
};

export default function AuthInput({ label, id, className = "", ...props }: AuthInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">{label}</label>
      <input
        id={id}
        {...props}
        className={`min-h-12 w-full rounded-lg border border-edge-15 bg-surface-alt px-4 py-3 text-base text-ink outline-none transition placeholder:text-ink-subtle hover:border-edge-25 focus:border-brand focus:ring-2 focus:ring-brand/20 user-invalid:border-red-400 user-invalid:ring-2 user-invalid:ring-red-400/15 ${className}`}
      />
    </div>
  );
}
