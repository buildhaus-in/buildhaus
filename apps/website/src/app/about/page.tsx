import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card, StatCard } from "@buildhaus/ui";

export default async function AboutPage() {
  const supabase = createClient();
  const { data: completed } = await supabase
    .from("public_projects")
    .select("id", { count: "exact", head: true })
    .eq("is_public", true);

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

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">About BuildHaus</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          The only construction brand built on one belief: the home you envision is the home you receive.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          We exist to ensure that the home you imagined is always the home you receive — no less
          in design, no less in transparency, no less in quality. Building across Andhra Pradesh &amp;
          Telangana — Hyderabad and Nellore today, expanding across premium residential markets.
        </p>
      </section>

      <section className="border-y border-border bg-sky-soft">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <div className="text-[11px] font-bold uppercase tracking-widest text-sandlight">Why BuildHaus exists</div>
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
              That is where BuildHaus begins. We saw a client who didn&apos;t want to micromanage —
              he wanted to be confident. So we built a construction experience around design that
              stands apart, pricing that hides nothing and a process that never leaves the client
              guessing. Nothing vague. Nothing hidden. Just a home that is exactly what was
              promised.
            </p>
            <p className="font-semibold text-ivory">
              BuildHaus exists for that moment — so a homeowner never has to fight for what they
              were promised, and never feels let down, at any stage of the build.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Purpose</div>
            <p className="mt-2 text-sm text-sand">
              The home you imagined should always be the home you receive. No less in design, no
              less in transparency and no less in quality.
            </p>
          </Card>
          <Card>
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">How we work</div>
            <p className="mt-2 text-sm text-sand">
              Most construction companies will tell you what they build. We will show you how —
              and let you decide if that is the standard you are looking for.
            </p>
          </Card>
          <Card>
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">What we hold to</div>
            <p className="mt-2 text-sm text-sand">
              Trust. Precision. Delivered as promised. Every message we send and every milestone we
              report connects back to that thought.
            </p>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-5 py-10">
          <StatCard label="Public portfolio projects" value={completed?.count ?? completed?.length ?? "—"} tone="brand" />
          <StatCard label="Construction stages tracked" value="25" tone="sand" />
          <StatCard label="Package tiers" value="4" sub="Basic · Standard · Premium · Luxury" tone="sand" />
          <StatCard label="Where we build" value="Hyderabad & Nellore" tone="sand" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="mb-2 text-xl font-bold text-ivory">What we stand for</h2>
        <p className="mb-6 max-w-xl text-sm text-muted">Five values, applied to every project. Stated once, held throughout.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {values.map((v, i) => (
            <Card key={v.title} className={i === values.length - 1 ? "sm:col-span-2" : undefined}>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-brand">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm font-bold text-ivory">{v.title}</span>
              </div>
              <p className="mt-2 text-sm text-muted">{v.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">Want to know what your build would cost?</div>
            <p className="mt-1 text-sm text-muted">An indicative cost, timeline and payment schedule in a couple of minutes. Nothing hidden.</p>
          </div>
          <Link href="/cost-estimator" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Try the Cost Estimator</Link>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
