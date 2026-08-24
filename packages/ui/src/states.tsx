import type { ReactNode } from "react";

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl2 border border-dashed border-border bg-card/50 p-10 text-center">
      <div className="text-sm font-semibold text-sandlight">{title}</div>
      {hint && <div className="mx-auto mt-1 max-w-sm text-xs text-muted">{hint}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: "linear-gradient(90deg,var(--surface) 0px,var(--border) 200px,var(--surface) 400px)",
        backgroundSize: "800px 100%",
        animation: "shimmer 1.4s infinite linear",
        minHeight: 16,
      }}
    />
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl2 border border-danger/40 bg-danger/10 p-5 text-sm text-danger">
      {message}
    </div>
  );
}
