import type { ReactNode } from "react";
import { BrandMark, DotGrid } from "./brand-mark";

// Shared opening band for every inner page — the brand collateral's
// warm-black panel (#1F1916) with an orange eyebrow, a dot grid and the
// oversized B mark (envelope / email-signature treatment), so the inner
// pages carry the same identity as the home page. Children render below the
// lead paragraph on the dark ground (buttons, prices, badges…), so anything
// passed in must use light-on-dark colours.
const WIDTHS = {
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
} as const;

export function PageHero({
  eyebrow,
  title,
  lead,
  width = "5xl",
  above,
  aside,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  width?: keyof typeof WIDTHS;
  /** Rendered above the eyebrow — breadcrumbs, back links. */
  above?: ReactNode;
  /** Rendered beside the copy from `sm` up (e.g. Mr Haus). */
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <DotGrid className="pointer-events-none absolute right-0 top-0 h-full w-64 text-white/10 sm:w-96" />
      <BrandMark className="pointer-events-none absolute -bottom-24 -right-16 w-72 text-brand/[0.14] sm:w-[26rem]" />
      <div
        className={`relative mx-auto ${WIDTHS[width]} px-5 py-14 sm:py-20 ${
          aside ? "flex flex-col-reverse items-center gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6" : ""
        }`}
      >
        <div>
          {above && <div className="mb-4 text-xs text-white/60">{above}</div>}
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand">{eyebrow}</div>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-black leading-[1.05] text-white sm:text-5xl">{title}</h1>
          {lead && <div className="mt-4 max-w-xl text-base text-white/75">{lead}</div>}
          {children}
        </div>
        {aside}
      </div>
    </section>
  );
}
