import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { inr, sqft } from "@buildhaus/utils";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { SERVICES } from "./services/data";
import { CATEGORY_HUE, hueForProjectType, hueFor } from "@/lib/palette";

// Public marketing home. Anonymous-safe: reads only public_projects and
// published testimonials.
export default async function Home() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("public_projects")
    .select("id,name,city,project_type,builtup_area_sqft,approx_cost,cost_per_sqft,completion_year,package")
    .eq("is_public", true)
    .order("is_featured", { ascending: false })
    .limit(6);

  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("id,client_name,quote,rating")
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-brand">Hyderabad &amp; Nellore · Andhra Pradesh &amp; Telangana</div>
            <h1 className="mt-3 text-4xl font-black leading-tight text-ivory sm:text-5xl">
              The home you envision is the home you receive.
            </h1>
            <p className="mt-4 max-w-xl text-sand">
              Buildhaus manages design, estimation, procurement and site execution under one
              accountable team — with every cost visible and every milestone reported before
              you have to ask. Clear processes. Honest pricing. Quality without compromise.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/cost-estimator" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Estimate your build</Link>
              <Link href="/projects" className="rounded-lg border border-border px-5 py-3 font-semibold text-sand hover:bg-card">See past projects</Link>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted">
              Trust. Precision. Delivered as promised.
            </p>
          </div>
          {/* Stock photo (Unsplash License, free for commercial use) — a
              generic house-under-construction shot, not a specific Buildhaus
              project. Swap for a real site photo once the Owner has one;
              never pair this with copy implying it's an actual Buildhaus
              build. */}
          <div className="overflow-hidden rounded-xl2 border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative stock photo, no optimisation pipeline needed for a single hero image */}
            <img
              src="/images/hero-house.jpg"
              alt="A home under construction — illustrative photo, not a specific Buildhaus project"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-sky-soft">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <div className="text-[11px] font-bold uppercase tracking-widest text-sandlight">What we build</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SERVICES.map((s) => {
              const hue = CATEGORY_HUE[s.slug];
              return (
                <Link
                  key={s.slug}
                  href={`/services/${s.slug}`}
                  className={`inline-flex items-center gap-1.5 rounded-full border ${hue.border} ${hue.bg} px-3 py-1.5 text-sm font-medium ${hue.text} hover:brightness-95`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${hue.dot}`} aria-hidden />
                  {s.title}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stock photos (Unsplash License, free for commercial use) —
          illustrative of the design/build/deliver process in general, not
          documentation of a specific Buildhaus project. Swap each for a
          real site/project photo as they become available; the "Featured
          projects" section below is the one place that must only ever show
          real, Owner-published project data. */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { src: "/images/blueprints.jpg", label: "Design", alt: "Architectural floor plans on a table", hue: hueFor(0) },
            { src: "/images/construction-workers.jpg", label: "Build", alt: "Construction workers on site", hue: hueFor(1) },
            { src: "/images/interior-luxury.jpg", label: "Deliver", alt: "A finished, high-end living room interior", hue: hueFor(4) },
          ].map((img) => (
            <div key={img.label} className="overflow-hidden rounded-xl2 border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative stock photos, no optimisation pipeline needed for three static images */}
              <img src={img.src} alt={img.alt} className="aspect-[4/3] w-full object-cover" />
              <div className={`flex items-center gap-2 border-t-2 ${img.hue.borderT} bg-card px-4 py-2.5`}>
                <span className={`h-2 w-2 rounded-full ${img.hue.dot}`} aria-hidden />
                <span className={`text-xs font-bold uppercase tracking-widest ${img.hue.text}`}>{img.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: "Nothing hidden", body: "Every line of cost is in the BOQ before you sign — and it stays visible through the build. No hidden costs. No surprises. Ever." },
            { title: "Precision without compromise", body: "Every structure is built to signed-off drawings, with documented quality checks at each stage — what was checked, what passed, what was resolved." },
            { title: "One point of accountability", body: "Design, procurement and execution under a single contract and a single point of responsibility, from blueprint to handover." },
          ].map((v, i) => {
            const hue = hueFor(i + 2);
            return (
              <div key={v.title} className={`rounded-xl2 border-l-4 ${hue.borderL} border-y border-r border-border bg-card p-5`}>
                <div className={`text-sm font-bold ${hue.text}`}>{v.title}</div>
                <p className="mt-2 text-sm text-muted">{v.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-14">
        <h2 className="mb-6 text-xl font-bold text-ivory">Featured projects</h2>
        {(!projects || projects.length === 0) ? (
          <div className="rounded-xl2 border border-dashed border-border p-10 text-center text-muted">
            Projects will appear here once the Owner publishes them.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p: any) => {
              const hue = hueForProjectType(p.project_type);
              return (
              <div key={p.id} className={`rounded-xl2 border-t-2 ${hue.borderT} border-x border-b border-border bg-card p-5`}>
                <div className={`text-xs font-bold uppercase tracking-wide ${hue.text}`}>{p.project_type}{p.package && <> · {p.package}</>}</div>
                <div className="mt-1 text-lg font-bold text-ivory">{p.name}</div>
                <div className="text-sm text-muted">{p.city}{p.completion_year && <> · {p.completion_year}</>}</div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                  <span>{sqft(p.builtup_area_sqft)}</span>
                  <span>~{inr(p.approx_cost)}</span>
                  {p.cost_per_sqft && <span>₹{p.cost_per_sqft}/sqft</span>}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {testimonials && testimonials.length > 0 && (
        <section className="border-y border-border bg-surface/40">
          <div className="mx-auto max-w-5xl px-5 py-14">
            <h2 className="mb-6 text-xl font-bold text-ivory">What our clients say</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t: any) => (
                <div key={t.id} className="rounded-xl2 border border-border bg-card p-5">
                  <div className="text-brand" aria-hidden>
                    {"★".repeat(t.rating)}
                    <span className="text-border">{"★".repeat(Math.max(0, 5 - t.rating))}</span>
                  </div>
                  <p className="mt-3 text-sm text-sand">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-4 text-sm font-semibold text-ivory">{t.client_name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-navy">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-5 px-5 py-14 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Not just construction, but confidence.</h2>
            <p className="mt-2 max-w-xl text-sm text-white/70">
              Most construction companies will tell you what they build. We will show you how —
              and let you decide if that is the standard you are looking for.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/process" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">See how we work</Link>
            <Link href="/enquiry" className="rounded-lg border border-white/25 px-5 py-3 font-semibold text-white hover:bg-white/10">Send an enquiry</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
