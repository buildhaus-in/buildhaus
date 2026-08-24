import { clsx } from "clsx";
import type { ReactNode } from "react";

function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">{children}</div>;
}
const fieldCls =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand";

export function Input({ label, error, className, ...rest }: { label?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-3 block">
      {label && <Label>{label}</Label>}
      <input className={clsx(fieldCls, error && "border-danger", className)} {...rest} />
      {error && <div className="mt-1 text-xs text-danger">{error}</div>}
    </label>
  );
}

export function Textarea({ label, error, className, ...rest }: { label?: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="mb-3 block">
      {label && <Label>{label}</Label>}
      <textarea className={clsx(fieldCls, "min-h-[88px]", error && "border-danger", className)} {...rest} />
      {error && <div className="mt-1 text-xs text-danger">{error}</div>}
    </label>
  );
}

export function Select({ label, children, className, ...rest }: { label?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="mb-3 block">
      {label && <Label>{label}</Label>}
      <select className={clsx(fieldCls, className)} {...rest}>{children}</select>
    </label>
  );
}
