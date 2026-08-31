import { clsx } from "clsx";
import type { ReactNode } from "react";

/* Button ------------------------------------------------------------------ */
type BtnVariant = "primary" | "ghost" | "outline" | "danger" | "subtle";
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "bg-brand text-white hover:brightness-110",
  ghost: "bg-transparent text-sand hover:bg-surface",
  outline: "border border-border text-sand hover:bg-surface",
  danger: "bg-danger text-white hover:brightness-110",
  subtle: "bg-surface text-sand border border-border hover:border-brand",
};

// Exposed so a navigation link can be styled exactly like a Button without
// nesting a real <button> inside an <a> — <a><button> is invalid content
// model (interactive content inside interactive content) and was found
// nested that way in a couple of pages that used <Link href><Button>...
// e.g. `<Link href={...} className={buttonClass("outline")}>Edit →</Link>`.
export function buttonClass(variant: BtnVariant = "primary", className?: string): string {
  return clsx(BTN_BASE, BTN_VARIANTS[variant], className);
}

export function Button({
  children, variant = "primary", className, type = "button", disabled, ...rest
}: {
  children: ReactNode; variant?: BtnVariant; className?: string;
  type?: "button" | "submit"; disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} disabled={disabled} className={buttonClass(variant, className)} {...rest}>
      {children}
    </button>
  );
}

/* Card -------------------------------------------------------------------- */
export function Card({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={clsx("rounded-xl2 border border-border bg-card p-5", className)}>
      {children}
    </div>
  );
}

/* Badge / StatusBadge ----------------------------------------------------- */
const TONE: Record<string, string> = {
  ok: "text-ok border-ok/30 bg-ok/10",
  warn: "text-warn border-warn/30 bg-warn/10",
  danger: "text-danger border-danger/30 bg-danger/10",
  brand: "text-brand border-brand/30 bg-brand/10",
  muted: "text-muted border-border bg-surface",
};
export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: keyof typeof TONE }) {
  return (
    <span className={clsx("inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", TONE[tone])}>
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, keyof typeof TONE> = {
  completed: "ok", approved: "ok", passed: "ok", won: "ok", approved_for_construction: "ok",
  in_progress: "warn", submitted: "warn", pending: "muted", draft: "muted",
  owner_review: "warn", client_review: "warn", sent_to_client: "warn",
  blocked: "danger", returned: "danger", failed: "danger", lost: "danger", revision_requested: "danger", superseded: "muted",
};
export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "muted";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <Badge tone={tone}>{label}</Badge>;
}

/* ProgressBar ------------------------------------------------------------- */
export function ProgressBar({ value, tone = "brand", height = 8 }: { value: number; tone?: "brand" | "ok" | "warn" | "danger"; height?: number }) {
  const color = { brand: "bg-brand", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger" }[tone];
  return (
    <div className="w-full overflow-hidden rounded-full bg-border" style={{ height }}>
      <div className={clsx("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* StatCard ---------------------------------------------------------------- */
export function StatCard({ label, value, tone = "brand", sub }: { label: string; value: ReactNode; tone?: "brand" | "ok" | "warn" | "danger" | "sand"; sub?: string }) {
  const color = { brand: "text-brand", ok: "text-ok", warn: "text-warn", danger: "text-danger", sand: "text-sand" }[tone];
  return (
    <div className="flex-1 min-w-[130px] rounded-xl2 border border-border bg-card p-4">
      <div className={clsx("text-xl font-extrabold", color)}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">{label}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
