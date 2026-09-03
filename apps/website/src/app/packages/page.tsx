import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card, Badge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Four specification tiers, one transparent starting rate per sqft — compare Basic, Standard, Premium and Luxury construction package inclusions.",
};

// Per brand rules, Premium (Signature Series) is the default recommendation.
const RECOMMENDED_KEY = "premium";

// One-line selection guide per package key (Pricing Catalog v2). Falls back
// to the package's own `description` for any key not listed here, so a new
// tier the Owner adds later never shows a blank line.
const SELECTION_GUIDE: Record<string, string> = {
  essential: "Best for budget-led or rental projects",
  premium: "Recommended for most end-use residential clients",
  luxury: "Best for premium residences and design-led homes",
};

// Package rate and inclusions/exclusions are ALWAYS read from
// `estimator_packages` — never hardcoded in this page.
export default async function PackagesPage() {
  const supabase = createClient();
  const { data: packages, error } = await supabase
    .from("estimator_packages")
    .select("id,key,label,rate_per_sqft,description,series,best_for,highlights,inclusions,exclusions")
    .order("rate_per_sqft", { ascending: true });

  // Distinguish "genuinely no packages configured yet" from "the query
  // itself failed" — these used to be conflated into the same "ask the
  // Owner to configure this" empty state below, which silently told every
  // visitor the Owner hadn't set anything up even when the real cause was
  // a broken query (see supabase/migrations/0022_estimator_packages_content_columns.sql).
  if (error) {
    throw new Error(`Couldn't load packages: ${error.message}`);
  }

  // "Four levels" was a leftover from an earlier catalog; the number of
  // tiers is whatever the Owner has actually configured, so it's spelled
  // out here rather than hardcoded.
  const tierCount = (packages ?? []).length;
  const tierWord = tierCount === 3 ? "Three" : tierCount === 4 ? "Four" : String(tierCount);

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">Construction packages</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          {tierWord} levels of experience. One transparent starting rate per sqft.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          Our packages are levels of experience, not just cost — every tier gets the same structural
          quality, an open itemised BOQ before agreement and a single point of contact throughout.
          Rates below feed directly into the Cost Estimator.
        </p>
        <p className="mt-3 max-w-xl text-xs text-muted">
          Rates are a starting reference, never a final price — the final cost depends on plot size,
          floor count, design complexity and site conditions.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        {(!packages || packages.length === 0) ? (
          <EmptyState title="Packages unavailable" hint="Package rates will appear here once configured by the Owner." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((p: any) => (
              <Card key={p.id} className={p.key === RECOMMENDED_KEY ? "border-brand/60" : ""}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-bold text-ivory">{p.label}</div>
                  {p.key === RECOMMENDED_KEY && <Badge tone="brand">Recommended</Badge>}
                </div>
                {p.series && (
                  <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-sandlight">{p.series}</div>
                )}
                <div className="mt-2 text-2xl font-extrabold text-brand">₹{Number(p.rate_per_sqft).toLocaleString("en-IN")}<span className="text-sm font-medium text-muted">/sqft</span></div>
                <p className="mt-2 text-sm text-muted">{p.description}</p>

                {(p.best_for ?? []).length > 0 && (
                  <>
                    <div className="mt-4 text-[11px] font-bold uppercase tracking-wide text-sandlight">Best for</div>
                    <ul className="mt-2 space-y-1.5">
                      {(p.best_for ?? []).map((b: string) => (
                        <li key={b} className="flex gap-2 text-sm text-sand">
                          <span className="text-brand">•</span><span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {(p.highlights ?? []).length > 0 && (
                  <>
                    <div className="mt-4 text-[11px] font-bold uppercase tracking-wide text-sandlight">Highlights</div>
                    <ul className="mt-2 space-y-1.5">
                      {(p.highlights ?? []).map((h: string) => (
                        <li key={h} className="flex gap-2 text-sm text-sand">
                          <span className="text-ok">✓</span><span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <Link
                  href={`/cost-estimator?package=${p.key}`}
                  className="mt-5 block rounded-lg bg-brand px-4 py-2.5 text-center font-semibold text-black"
                >
                  Get an instant quotation
                </Link>
                <Link
                  href={`/packages/${p.key}`}
                  className="mt-2 block rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-sand hover:bg-surface"
                >
                  View full specification
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-xl font-bold text-ivory">Which package is right for you?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(packages ?? []).map((p: any) => (
              <div key={p.id} className="rounded-xl2 border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ivory">{p.label}</span>
                  {p.key === RECOMMENDED_KEY && <Badge tone="brand">Recommended</Badge>}
                </div>
                <p className="mt-1.5 text-xs text-muted">{SELECTION_GUIDE[p.key] ?? p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The catalog's general inclusions/exclusions apply to every package,
          so they render once here (read from the packages themselves) rather
          than repeating on all four cards. */}
      {(packages ?? []).length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-xl font-bold text-ivory">What every package covers</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">
            These apply across all four tiers — the tiers differ in material brands and finish
            budgets, not in scope.
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <Card>
              <div className="text-sm font-bold text-ivory">General inclusions</div>
              <ul className="mt-3 space-y-1.5">
                {(((packages ?? [])[0] as any)?.inclusions ?? []).map((inc: string) => (
                  <li key={inc} className="flex gap-2 text-sm text-sand">
                    <span className="text-ok">✓</span><span>{inc}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="text-sm font-bold text-ivory">General exclusions</div>
              <ul className="mt-3 space-y-1.5">
                {(((packages ?? [])[0] as any)?.exclusions ?? []).map((exc: string) => (
                  <li key={exc} className="flex gap-2 text-sm text-muted">
                    <span className="text-danger">✕</span><span>{exc}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>
      )}

      {/* Customized Project Management is a management-only model priced as a
          percentage of project cost — it is intentionally NOT an
          estimator_packages row, so it never appears in the per-sqft Cost
          Estimator's package selector. */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <Card className="border-border">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Management-only Model</div>
              <h2 className="mt-1 text-xl font-bold text-ivory">Customized Project Management</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                You source the materials and labour — Buildhaus manages and supervises the build with
                professional oversight from planning to handover.
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-brand">10%–14%<span className="text-sm font-medium text-muted"> of total project cost</span></div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Scope of management</div>
              <ul className="mt-2 space-y-1.5">
                {[
                  "Project planning & execution coordination",
                  "Site supervision & progress monitoring",
                  "Quality checks at major stages",
                  "Quantity verification & billing review",
                  "Contractor & vendor coordination",
                  "Timeline & milestone tracking",
                  "Structured client updates",
                  "Cost-control support",
                ].map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-sand"><span className="text-ok">✓</span><span>{s}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Suitable for</div>
              <ul className="mt-2 space-y-1.5">
                {[
                  "Custom homes and premium villas",
                  "Projects with client-sourced materials",
                  "Owners who want procurement flexibility with professional oversight",
                ].map((s) => (
                  <li key={s} className="flex gap-2 text-sm text-sand"><span className="text-brand">•</span><span>{s}</span></li>
                ))}
              </ul>
              <Link href="/contact" className="mt-5 inline-block rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-sand hover:bg-surface">
                Talk to us about management-only
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
