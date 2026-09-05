import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card } from "@buildhaus/ui";
import { hueFor } from "@/lib/palette";

// The two official Buildhaus client journeys from the brand strategy:
// how an engagement starts (sales journey) and how the build itself runs
// (construction journey). Every step is designed so the client never has
// to ask what happens next.

const SALES_JOURNEY: { title: string; body: string }[] = [
  { title: "Discovery", body: "You find Buildhaus through Instagram, Google or a referral — usually while researching who can actually be trusted with your plot." },
  { title: "First contact", body: "We open with one smart question about your build, not a brochure." },
  { title: "Qualification call", body: "Plot, stage, budget, timeline. This call is a filter, not a pitch — it tells both of us whether we are the right fit." },
  { title: "Site visit & discovery meeting", body: "We walk the plot and sit with your family to understand the vision and what the home needs to be — including Vastu, where it matters to you." },
  { title: "Design direction", body: "The moment you begin to see your home take shape — a considered direction, not a template." },
  { title: "BOQ walkthrough", body: "Every cost visible before you sign anything. Line by line, nothing hidden." },
  { title: "Agreement", body: "Scope, cost, timeline and milestones locked in writing." },
  { title: "Execution onboarding", body: "A dedicated point of contact is assigned and your update cadence is set — before the first brick." },
];

const CONSTRUCTION_JOURNEY: { title: string; body: string }[] = [
  { title: "Initial consultation", body: "Your requirements, priorities and constraints, understood before anything is proposed." },
  { title: "Site assessment", body: "Orientation, soil, access, legal clearances and Vastu — the facts of the plot, documented." },
  { title: "Design development", body: "Architecture and layouts developed for your family and your plot. No standard templates." },
  { title: "BOQ & transparent pricing", body: "A complete bill of quantities with honest pricing. You see exactly what you are paying for." },
  { title: "Agreement & onboarding", body: "Scope, milestones and payment schedule agreed in writing; your point of contact introduced." },
  { title: "Pre-construction", body: "Approvals, procurement plans and site mobilisation. Structure precedes action." },
  { title: "Construction & execution", body: "The build runs stage by stage, with structured updates at every milestone — without you having to ask." },
  { title: "Stage-wise quality checks", body: "Each stage is checked and documented. You see what was checked, what passed and what was resolved." },
  { title: "Final walkthrough & handover", body: "The home is handed over only when it matches what was agreed. Exactly as promised." },
];

// `hueOffset` staggers the two journey lists (sales vs. construction) onto
// different starting points in the spectrum, so the two columns read as
// distinct even though each individually cycles through the same palette.
function JourneyList({ steps, hueOffset = 0 }: { steps: { title: string; body: string }[]; hueOffset?: number }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const hue = hueFor(i + hueOffset);
        return (
          <li key={s.title} className={`flex gap-4 rounded-xl2 border-l-4 ${hue.borderL} border-y border-r border-border bg-card p-4`}>
            <div className={`w-7 shrink-0 text-sm font-bold ${hue.text}`}>{String(i + 1).padStart(2, "0")}</div>
            <div>
              <div className="text-sm font-bold text-ivory">{s.title}</div>
              <p className="mt-1 text-sm text-muted">{s.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ProcessPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">How we work</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          A process that never leaves you guessing.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          From your first conversation with us to the day you receive your keys, every step is
          structured, documented and visible. One partner. Full accountability. Zero chaos.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-ivory">Before we build</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              How an engagement starts — eight steps from first contact to a signed agreement,
              with every cost visible before you commit to anything.
            </p>
            <JourneyList steps={SALES_JOURNEY} hueOffset={0} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ivory">How your home gets built</h2>
            <p className="mt-1 mb-5 text-sm text-muted">
              Nine stages from consultation to handover — each one checked, documented and
              reported before the next begins.
            </p>
            <JourneyList steps={CONSTRUCTION_JOURNEY} hueOffset={2} />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-sky-soft">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-xl font-bold text-ivory">You never have to ask for an update.</h2>
          <p className="mt-2 max-w-2xl text-sm text-sandlight">
            Once your project is underway, every stage appears on your client portal with a live
            status, daily site reports, photos and drawing approvals — surfaced before the
            question is asked. That is what radical transparency means in practice.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">Want a stage-wise timeline for your build?</div>
            <p className="mt-1 text-sm text-muted">The Cost Estimator gives you an indicative duration for each stage.</p>
          </div>
          <Link href="/cost-estimator" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Estimate your timeline</Link>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
