import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card } from "@buildhaus/ui";
import { SERVICES } from "./data";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Independent houses, villas, duplexes, apartments, offices, commercial, warehouses, factories, interiors and renovations — design-led construction in Hyderabad & Nellore, from blueprint to handover.",
};

const PROCESS_STEPS = [
  { step: "1. Enquiry & site visit", body: "Share your plot details and requirement — we walk the site and assess soil, access and orientation." },
  { step: "2. Design & estimate", body: "Considered drawings for your plot and family, alongside an indicative cost from the Cost Estimator." },
  { step: "3. BOQ & agreement", body: "Every cost visible before you sign anything — scope, timeline and payment schedule locked in writing." },
  { step: "4. Construction & reporting", body: "Stage-wise execution with structured updates on your client portal — before you have to ask." },
  { step: "5. Quality checks & handover", body: "Documented checks at every stage, and handover only when the build matches what was agreed." },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">What we build</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          Built for those who expect better.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          Whichever building you&apos;re planning, Buildhaus carries it from blueprint to handover —
          design, procurement, site execution and quality under one accountable team.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <Link key={s.slug} href={`/services/${s.slug}`}>
              <Card className="h-full transition-colors hover:border-brand/50">
                <div className="text-sm font-bold text-ivory">{s.title}</div>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
                <div className="mt-3 text-xs font-semibold text-brand">Learn more →</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="mb-6 text-xl font-bold text-ivory">How an engagement runs</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PROCESS_STEPS.map((p) => (
              <div key={p.step} className="rounded-xl2 border border-border bg-card p-4">
                <div className="text-sm font-bold text-brand">{p.step}</div>
                <p className="mt-2 text-xs text-muted">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link href="/process" className="text-sm font-semibold text-brand hover:underline">See the full client journey →</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">Not sure which package fits your build?</div>
            <p className="mt-1 text-sm text-muted">Compare Basic, Standard, Premium and Luxury specifications side by side — inclusions and exclusions, all visible.</p>
          </div>
          <Link href="/packages" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">View packages</Link>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
