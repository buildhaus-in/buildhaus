import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { PageHero } from "@/components/public/page-hero";
import { Card, StatCard } from "@buildhaus/ui";
import { hueFor } from "@/lib/palette";
import { BrandMark } from "@/components/public/brand-mark";

export default async function AboutPage() {

  const values = [
    {
      title: "Radical transparency",
      body: "Our clients never have to ask for an update. The process is built to surface information — costs, progress, decisions — before the question is asked.",
    },
    {
      title: "Precision without compromise",
      body: "Every drawing is signed off, every stage is checked and documented, and nothing moves forward until it meets the standard we agreed to.",
    },
    {
      title: "Design with purpose",
      body: "Every spatial decision serves your vision, not a template. For clients who value it, that includes Vastu-conscious design — a home should feel right in every sense.",
    },
    {
      title: "Structured accountability",
      body: "Systems, not promises. A single point of responsibility carries your project from blueprint to handover.",
    },
    {
      title: "Client-first integrity",
      body: "We state costs once, honestly, and hold to them. When a trade-off exists, you hear about it from us first — with the facts to decide.",
    },
  ];

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <PageHero
        eyebrow="About Buildhaus"
        title="The only construction brand built on one belief: the home you envision is the home you receive."
        lead={<>We exist to ensure that the home you imagined is always the home you receive — no less
          in design, no less in transparency, no less in quality. Building across Andhra Pradesh &amp;
          Telangana — Hyderabad and Nellore today, expanding across premium residential markets.</>}
      />

      {/* Straight from the brand strategy deck (Evakee Studios, "Buildhaus
          File export.pdf") — the tagline and supporting line the identity
          was built around, not yet used elsewhere on the site. */}
      <section className="bg-brand">
        <div className="mx-auto max-w-3xl px-5 py-12 text-center">
          <h2 className="text-2xl font-black text-white sm:text-3xl">
            Building <span className="text-navy">Beyond</span> Expectations.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/90 sm:text-base">
            At Buildhaus, we focus on what matters most — strong foundations, precise execution,
            and complete transparency at every step. From blueprint to handover, we build with
            discipline, quality, and integrity. Because your dream deserves more than just
            construction.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-sky-soft">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
          {/* Black-and-white site photo from the brand company profile, per
              the collateral's "use black and white imagery" rule. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- single decorative brand photo */}
          <img
            src="/images/brand/rebar-crew-bw.jpg"
            alt="Workers tying reinforcement steel against the sky on a construction site"
            className="hidden aspect-[3/4] w-full rounded-xl2 object-cover lg:block"
          />
          <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-sandlight">Why Buildhaus exists</div>
          <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-sandlight">
            <p>
              There was never a shortage of builders. Lists were long. Options were endless. And
              yet, every plot owner stood at the start of the same journey, unsure. Not because
              there wasn&apos;t anyone to hire — but because no one truly felt right. Too vague on
              costs. Too silent on progress. Too quick to promise and too slow to deliver.
            </p>
            <p>
              The market was built on extremes: large platforms running standardised systems with
              no design soul, or local contractors operating on handshakes and hope. There was no
              middle ground.
            </p>
            <p>
              That is where Buildhaus begins. We saw a client who didn&apos;t want to micromanage —
              he wanted to be confident. So we built a construction experience around design that
              stands apart, pricing that hides nothing and a process that never leaves the client
              guessing. Nothing vague. Nothing hidden. Just a home that is exactly what was
              promised.
            </p>
            <p className="font-semibold text-ivory">
              Buildhaus exists for that moment — so a homeowner never has to fight for what they
              were promised, and never feels let down, at any stage of the build.
            </p>
          </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Vision", body: "To become the most trusted name in design-led construction, where every home delivered stands as proof that precision, transparency and great design can exist without compromise." },
            { title: "Mission", body: "Design-led, precision-built homes for ambitious plot owners — structured with complete transparency, crafted without compromise and handed over exactly as promised." },
            { title: "How we work", body: "Most construction companies will tell you what they build. We will show you how — and let you decide if that is the standard you are looking for." },
          ].map((c, i) => {
            const hue = hueFor(i);
            return (
              <Card key={c.title} className={`border-t-2 ${hue.borderT}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wide ${hue.text}`}>{c.title}</div>
                <p className="mt-2 text-sm text-sand">{c.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-sky-soft">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-5 py-10">
          {/* Owner-published figures: brochure p2/p6, company profile p2/p8–9. */}
          <StatCard label="Projects handled" value="60+" sub="Construction & interiors" tone="brand" />
          <StatCard label="Projects completed" value="54+" tone="sand" />
          <StatCard label="Client satisfaction" value="95%+" tone="sand" />
          <StatCard label="Construction stages tracked" value="25" tone="sand" />
          <StatCard label="Package tiers" value="4" sub="Basic · Standard · Premium · Luxury" tone="sand" />
          <StatCard label="Where we build" value="Hyderabad & Nellore" tone="sand" />
        </div>
      </section>

      {/* Brand personality — the six traits from the brand strategy
          document (p41), on the warm-black panel used across the collateral. */}
      <section className="relative overflow-hidden bg-navy">
        <BrandMark className="pointer-events-none absolute -right-20 -top-16 w-96 text-brand/15" />
        <div className="relative mx-auto max-w-5xl px-5 py-16">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Who we are</div>
          <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">
            Warm enough to trust. Precise enough to believe.
          </h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-xl2 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Precise", b: "Considered and exact. Every decision is intentional; nothing is left to chance." },
              { t: "Assured", b: "Confident without being loud. Lets the work speak for itself." },
              { t: "Design-led", b: "Thinks architecturally first. Sees beauty and function as inseparable." },
              { t: "Accountable", b: "Owns every outcome. Never deflects, never disappears." },
              { t: "Transparent", b: "Open and honest at every stage. No surprises, no fine print." },
              { t: "Grounded", b: "Rooted in the places we build. Understands its people and speaks their language." },
            ].map((x) => (
              <div key={x.t} className="bg-navy p-6">
                <div className="font-display text-lg font-bold text-cream">{x.t}</div>
                <p className="mt-2 text-sm text-white/70">{x.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="mb-2 text-xl font-bold text-ivory">What we stand for</h2>
        <p className="mb-6 max-w-xl text-sm text-muted">Five values, applied to every project. Stated once, held throughout.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((v, i) => {
            const hue = hueFor(i);
            return (
              <Card key={v.title} className={`border-l-4 ${hue.borderL} ${i === values.length - 1 ? "sm:col-span-2" : ""}`}>
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-bold ${hue.text}`}>{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-bold text-ivory">{v.title}</span>
                </div>
                <p className="mt-2 text-sm text-muted">{v.body}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">Want to know what your build would cost?</div>
            <p className="mt-1 text-sm text-muted">An indicative cost, timeline and payment schedule in a couple of minutes. Nothing hidden.</p>
          </div>
          <Link href="/cost-estimator" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-deep">Try the Cost Estimator</Link>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
