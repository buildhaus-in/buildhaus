import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { sqft } from "@buildhaus/utils";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { MrHaus } from "@/components/public/mr-haus";
import { Tilt, Reveal } from "@/components/public/motion";
import { HouseWalkthrough } from "@/components/public/house-walkthrough";
import { BrandMark, DotGrid } from "@/components/public/brand-mark";
import { SERVICES } from "./services/data";
import { hueForProjectType, hueFor, projectTypeLabel } from "@/lib/palette";

// Public marketing home. Anonymous-safe: reads only public_projects and
// published testimonials.
export default async function Home() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("public_projects")
    .select("id,name,city,project_type,builtup_area_sqft,completion_year,package")
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

      {/* The page opens on the reel-style scroll walkthrough of the villa
          (per "add the 3d design on the starting of the website page"). It
          replaces the earlier hero photo (/images/hero-house.jpg, kept on
          disk); the headline card follows directly after. */}
      <HouseWalkthrough />

      <section className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="relative flex flex-col rounded-xl2 bg-navy p-5 shadow-xl sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:p-10">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-brand">Hyderabad &amp; Nellore · Andhra Pradesh &amp; Telangana</div>
            <h1 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              The home you envision is the home you receive.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-white/75 sm:text-base">
              Buildhaus manages design, estimation, procurement and site execution under one
              accountable team — with every cost visible and every milestone reported before
              you have to ask. Clear processes. Honest pricing. Quality without compromise.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/cost-estimator" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white transition hover:bg-brand-deep">Estimate your build</Link>
              <Link href="/projects" className="rounded-lg border border-white/30 px-5 py-3 font-semibold text-white hover:bg-white/10">See past projects</Link>
            </div>
            {/* Real, already-published Buildhaus facts (same numbers as
                /about's StatCards) — never an invented stat. */}
            <div className="mt-6 flex flex-wrap gap-2">
              <div className="rounded-xl2 bg-white/10 px-3 py-2">
                <div className="text-lg font-extrabold text-brand">25</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Stages tracked</div>
              </div>
              <div className="rounded-xl2 bg-white/10 px-3 py-2">
                <div className="text-lg font-extrabold text-brand">4</div>
                <div className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Transparent packages</div>
              </div>
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-white/50">
              Trust. Precision. Delivered as promised.
            </p>
          </div>
          {/* Mr Haus stands in the hero card rather than the closing CTA
              band, per "I can see him only in main page bottom, I'd prefer
              somewhere he is more visible" — this is the first thing on the
              page. A normal flex child (not an absolutely-positioned
              overlay) so the card grows to his full height instead of
              cropping his head off. He now shows at every width: on phones
              and tablets the card stacks, so he sits under the copy and
              right-aligned at a smaller size, which keeps the headline and
              buttons at full width; from `lg` he stands beside them,
              bottom-aligned and much larger. */}
          <MrHaus className="mt-4 h-40 self-end sm:h-48 lg:mt-0 lg:h-80 xl:h-96" />
        </div>
      </section>

      {/* Proof band on the brand's sand ground (#EDCFA4 — business card,
          billboard, QR card). Numbers are the Owner's own published figures
          from the brochure and company profile ("Buildhaus Brochure.pdf"
          p2/p6, "Company Profile Presentation.pdf" p2/p8–9): 60+ handled,
          54+ completed, 35 construction, 25 interiors, 95%+ satisfaction.
          Update here if those documents change. The geometric block on the
          right echoes the business card's orange + warm-black shapes. */}
      <section className="relative overflow-hidden bg-cream">
        <div className="relative mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-navy/70">Built on trust · Proven through work</div>
            <h2 className="mt-3 max-w-xl text-3xl font-black leading-[1.05] text-navy sm:text-5xl">
              Every number here is a home someone trusted us with.
            </h2>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
              {[
                { v: "60+", l: "Projects handled" },
                { v: "54+", l: "Projects completed" },
                { v: "95%+", l: "Client satisfaction" },
                { v: "35", l: "Construction projects" },
                { v: "25", l: "Interior projects" },
                { v: "25", l: "Stages tracked per build" },
              ].map((s) => (
                <div key={s.l} className="border-t-2 border-navy pt-3">
                  <dt className="sr-only">{s.l}</dt>
                  <dd className="font-display text-4xl font-black tracking-tight text-navy sm:text-5xl">{s.v}</dd>
                  <dd className="mt-1 text-[11px] font-bold uppercase tracking-widest text-navy/70">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-sm lg:block" aria-hidden>
            <div className="absolute bottom-0 left-0 h-[46%] w-[62%] bg-brand" />
            <div className="absolute right-[6%] top-0 h-full w-[44%] bg-navy [clip-path:polygon(0_0,62%_0,100%_22%,100%_100%,0_100%)]" />
            <BrandMark className="absolute bottom-[8%] left-[8%] w-[22%] text-cream" />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-sky-soft">
        <div className="mx-auto max-w-5xl px-5 py-8">
          <div className="text-[11px] font-bold uppercase tracking-widest text-sandlight">What we build</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone bg-white/70 px-3 py-1.5 text-sm font-medium text-ivory transition hover:border-brand hover:text-brand-deep"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                {s.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Design/Build photos extracted from the Owner's own brand strategy
          deck (Evakee Studios, "Buildhaus File export.pdf") — the Owner's
          own commissioned photography, not stock. "Build" carries the
          brand's alternate "Bh" logo lockup baked into the source image
          (the Owner reviewed this and approved using it as-is). Deliver
          stays an Unsplash stock photo (illustrative, not a specific
          Buildhaus project); the "Featured projects" section below is the
          one place that must only ever show real, Owner-published project
          data. */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { src: "/images/blueprints.jpg", label: "Design", alt: "An architect reviewing rolled architectural drawings at a desk", hue: hueFor(0) },
            { src: "/images/construction-workers.jpg", label: "Build", alt: "A construction worker carrying a wooden beam on an RCC framework site, under a tower crane", hue: hueFor(1) },
            { src: "/images/interior-luxury.jpg", label: "Deliver", alt: "A finished, high-end living room interior", hue: hueFor(4) },
          ].map((img, i) => (
            <Reveal key={img.label} delay={i * 90}>
              <Tilt className="h-full overflow-hidden rounded-xl2 border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative stock photos, no optimisation pipeline needed for three static images */}
                <img src={img.src} alt={img.alt} className="aspect-[4/3] w-full object-cover grayscale transition duration-700 hover:grayscale-0" />
                <div className={`flex items-center gap-2 border-t-2 ${img.hue.borderT} bg-card px-4 py-2.5`}>
                  <span className={`h-2 w-2 rounded-full ${img.hue.dot}`} aria-hidden />
                  <span className={`text-xs font-bold uppercase tracking-widest ${img.hue.text}`}>{img.label}</span>
                </div>
              </Tilt>
            </Reveal>
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
              <Reveal key={v.title} delay={i * 90}>
                <Tilt className={`h-full rounded-xl2 border-l-4 ${hue.borderL} border-y border-r border-border bg-card p-5`}>
                  <div className={`text-sm font-bold ${hue.text}`}>{v.title}</div>
                  <p className="mt-2 text-sm text-muted">{v.body}</p>
                </Tilt>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Brand promise — lines taken verbatim from the brand strategy
          document ("_Brand Strategy Document For BuildHaus.pdf", p50–53:
          messaging examples and the closing thought). Photo: black-and-white
          site image from the Owner's post templates, per the brand rule
          "use black and white imagery". */}
      <section className="relative overflow-hidden bg-navy">
        <DotGrid className="pointer-events-none absolute right-0 top-0 h-48 w-72 text-white/15" />
        <div className="relative mx-auto grid max-w-5xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- single decorative brand photo */}
              <img
                src="/images/brand/site-walkthrough-bw.jpg"
                alt="Two people walking through a bare concrete structure on a construction site"
                className="aspect-[4/5] w-full rounded-xl2 object-cover"
              />
              <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-brand sm:h-32 sm:w-32" aria-hidden />
            </div>
          </Reveal>
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Our promise</div>
            <h2 className="mt-3 text-3xl font-black leading-[1.08] text-white sm:text-4xl">
              It&apos;s not about finding the right builder. It&apos;s about never feeling uncertain about the one you chose.
            </h2>
            <ul className="mt-8 space-y-4">
              {[
                "No hidden costs. No surprises. Ever.",
                "Your home, exactly as you planned it.",
                "One partner. Full accountability. Zero chaos.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-base text-white/85 sm:text-lg">
                  <span className="mt-2 h-2 w-2 shrink-0 bg-brand" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-white/50">Trust. Precision. Delivered as promised.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="mb-6 text-xl font-bold text-ivory">Featured projects</h2>
        {(!projects || projects.length === 0) ? (
          <div className="rounded-xl2 border border-dashed border-border p-10 text-center text-muted">
            Projects will appear here once the Owner publishes them.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p: any, i: number) => {
              const hue = hueForProjectType(p.project_type);
              // Client-identifying project names (e.g. a family surname)
              // don't appear on the public homepage teaser — just the build
              // type ("G+2" for a duplex, per an explicit request — see
              // @/lib/palette's PROJECT_TYPE_LABEL). The full name still
              // shows on the project's own /projects/[slug] page.
              const typeLabel = projectTypeLabel(p.project_type);
              return (
              <Reveal key={p.id} delay={i * 90}>
              <Tilt className={`h-full rounded-xl2 border-t-2 ${hue.borderT} border-x border-b border-border bg-card p-5`}>
                {p.package && (
                  <div className={`text-xs font-bold uppercase tracking-wide ${hue.text}`}>{p.package}</div>
                )}
                <div className="mt-1 text-lg font-bold text-ivory">{typeLabel}</div>
                <div className="text-sm text-muted">{p.city}{p.completion_year && <> · {p.completion_year}</>}</div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                  <span>{sqft(p.builtup_area_sqft)}</span>
                </div>
              </Tilt>
              </Reveal>
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

      {/* Full-bleed orange band — the brochure's signature page treatment. */}
      {/* Headline from the brand billboard ("Application Presentation Color
          pallete.pdf" p5): "Your Dream Home. No surprises. No Hidden Cost." */}
      <section className="relative overflow-hidden bg-brand">
        <BrandMark className="pointer-events-none absolute -right-16 -top-10 w-80 text-navy/15 sm:w-[28rem]" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-5 py-16 sm:flex-row sm:items-center sm:py-20">
          <div className="sm:max-w-xl">
            <h2 className="text-3xl font-black leading-[1.05] text-white sm:text-5xl">
              Your dream home.<br />No surprises.<br /><span className="text-navy">No hidden cost.</span>
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/90">
              Most construction companies will tell you what they build. We will show you how —
              and let you decide if that is the standard you are looking for.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/process" className="rounded-lg bg-navy px-5 py-3 font-semibold text-white transition hover:bg-black">See how we work</Link>
            <Link href="/enquiry" className="rounded-lg border border-white/70 px-5 py-3 font-semibold text-white hover:bg-white/10">Send an enquiry</Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
