import Link from "next/link";
import { PORTAL_URL } from "@/lib/env";

// Shared header/footer for every public, no-login page (home, about,
// services, services/[slug], packages, packages/[slug], cost-estimator,
// quotation/[token], projects, process, materials, contact, enquiry,
// request-site-visit, request-callback, faq). Carries the official brand
// identity — the exact shipped logo files (public/brand/*.svg, copied
// verbatim from "Buildhaus Logo File/", never redrawn) in the header and a
// deep-navy footer panel, so the whole public site reads as one brand.
//
// Header uses the "WM 5" wordmark-on-card variant (public/brand/
// wordmark-5-bg.svg — orange wordmark on a light-gray card, from "Buildhaus
// Logo File/Wordmark/With Background/SVG/WM 5.svg", copied verbatim) —
// chosen over the WM 3 variant (tan-on-light-gray) for contrast against the
// header's own light background, and it matches the brand orange used
// throughout the rest of the site. The footer keeps the plain white
// wordmark (public/brand/wordmark-white.svg): a light-card badge would
// clash sitting on the dark navy footer panel, so that one stays as-is.

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/cost-estimator", label: "Cost Estimator" },
  { href: "/projects", label: "Projects" },
  { href: "/contact", label: "Contact" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="Buildhaus — home">
          {/* eslint-disable-next-line @next/next/no-img-element -- the
              official logo SVG, served byte-for-byte as shipped; not a
              content image next/image should optimise/rewrite. */}
          <img
            src="/brand/wordmark-5-bg.svg"
            alt="Buildhaus — Design, Build, Deliver"
            className="h-24 w-24 rounded-xl sm:h-28 sm:w-28"
          />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sand hover:bg-card">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/enquiry" className="hidden rounded-lg border border-border px-3 py-2 text-sm font-semibold text-sand hover:bg-card sm:inline-block">
            Enquiry
          </Link>
          <a href={`${PORTAL_URL}/login`} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
            Login
          </a>
        </div>
      </div>
    </header>
  );
}

const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/services", label: "Services" },
      { href: "/packages", label: "Packages" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/projects", label: "Past projects" },
      { href: "/process", label: "How we work" },
      { href: "/materials", label: "Materials & specs" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    title: "Get in touch",
    links: [
      { href: "/contact", label: "Contact us" },
      { href: "/enquiry", label: "Send an enquiry" },
      { href: "/request-site-visit", label: "Request a site visit" },
      { href: "/request-callback", label: "Request a callback" },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="bg-navy print:hidden">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- see PublicHeader above */}
            <img src="/brand/wordmark-white.svg" alt="Buildhaus" className="h-auto w-[160px]" />
            <p className="mt-4 max-w-[230px] text-sm text-white/70">
              Design-led construction across Andhra Pradesh &amp; Telangana —
              Hyderabad and Nellore. From blueprint to handover — built exactly
              as promised.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-sky">{col.title}</div>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/70 hover:text-brand">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-baseline sm:justify-between">
          <div>© {new Date().getFullYear()} Buildhaus. Trust. Precision. Delivered as promised.</div>
          <div className="text-xs text-white/40">Estimates are indicative; final cost is confirmed after site inspection &amp; BOQ.</div>
        </div>
      </div>
    </footer>
  );
}
