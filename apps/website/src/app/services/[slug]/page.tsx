import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card } from "@buildhaus/ui";
import { inr, sqft } from "@buildhaus/utils";
import { WEBSITE_URL } from "@/lib/env";
import { SERVICES, getService } from "../data";

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const service = getService(params.slug);
  if (!service) return {};
  const title = `${service.title} Construction`;
  const description = `${service.body} ${service.suitableFor}`;
  const url = `${WEBSITE_URL}/services/${service.slug}`;
  return {
    title,
    description,
    openGraph: { type: "website", title, description, url },
    twitter: { card: "summary", title, description },
    alternates: { canonical: url },
  };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = getService(params.slug);
  if (!service) notFound();

  const supabase = createClient();
  const { data: packages } = await supabase
    .from("estimator_packages")
    .select("key,label,rate_per_sqft")
    .order("rate_per_sqft", { ascending: true });

  const { data: faqs } = await supabase
    .from("faqs")
    .select("id,category,question,answer")
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  const relevantFaqs = (faqs ?? []).filter((f: any) => service.faqCategories.includes(f.category)).slice(0, 4);

  let relatedProjects: any[] = [];
  if (service.projectType) {
    const { data } = await supabase
      .from("public_projects")
      .select("id,slug,name,city,builtup_area_sqft,approx_cost,completion_year")
      .eq("is_public", true)
      .eq("project_type", service.projectType)
      .limit(3);
    relatedProjects = data ?? [];
  }

  const rates = (packages ?? []).map((p: any) => Number(p.rate_per_sqft)).filter((n: number) => n > 0);
  const minRate = rates.length ? Math.min(...rates) : null;
  const maxRate = rates.length ? Math.max(...rates) : null;
  const costLow = minRate ? minRate * service.sizeMinSqft : null;
  const costHigh = maxRate ? maxRate * service.sizeMaxSqft : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: WEBSITE_URL },
      { "@type": "ListItem", position: 2, name: "Services", item: `${WEBSITE_URL}/services` },
      { "@type": "ListItem", position: 3, name: service.title, item: `${WEBSITE_URL}/services/${service.slug}` },
    ],
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: `${service.title} Construction`,
    name: `${service.title} Construction — Buildhaus`,
    description: service.body,
    provider: {
      "@type": "GeneralContractor",
      name: "Buildhaus Constructions",
      areaServed: ["Hyderabad", "Nellore"],
    },
    areaServed: ["Hyderabad", "Nellore"],
    ...(minRate && maxRate
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: minRate,
            highPrice: maxRate,
            unitText: "per sqft",
          },
        }
      : {}),
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-sand">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/services" className="hover:text-sand">Services</Link>
          <span className="mx-1.5">/</span>
          <span className="text-sand">{service.title}</span>
        </nav>
        <div className="mt-4 text-xs font-bold uppercase tracking-widest text-brand">Service</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          {service.title}
        </h1>
        <p className="mt-4 max-w-xl text-sand">{service.body}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/cost-estimator`} className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Get an instant estimate</Link>
          <Link href="/enquiry" className="rounded-lg border border-border px-5 py-3 font-semibold text-sand hover:bg-card">Send an enquiry</Link>
          <Link href="/contact" className="rounded-lg border border-border px-5 py-3 font-semibold text-sand hover:bg-card">Contact us</Link>
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto grid max-w-5xl gap-4 px-5 py-8 sm:grid-cols-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Suitable for</div>
            <p className="mt-1.5 text-sm text-sand">{service.suitableFor}</p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Typical size</div>
            <p className="mt-1.5 text-sm text-sand">{service.sizeLabel}</p>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Approx. timeline</div>
            <p className="mt-1.5 text-sm text-sand">{service.timeline}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="text-sm font-bold text-ivory">Scope of work</div>
            <ul className="mt-3 space-y-1.5">
              {service.scopeOfWork.map((s) => (
                <li key={s} className="flex gap-2 text-sm text-sand"><span className="text-ok">✓</span><span>{s}</span></li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="text-sm font-bold text-ivory">Material options</div>
            <ul className="mt-3 space-y-1.5">
              {service.materialOptions.map((m) => (
                <li key={m} className="flex gap-2 text-sm text-sand"><span className="text-brand">•</span><span>{m}</span></li>
              ))}
            </ul>
            <Link href="/materials" className="mt-4 inline-block text-xs font-semibold text-brand hover:underline">See full material specifications →</Link>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="mb-6 text-xl font-bold text-ivory">Design & construction process</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {service.process.map((p, i) => (
              <div key={p} className="rounded-xl2 border border-border bg-card p-4">
                <div className="text-sm font-bold text-brand">{i + 1}.</div>
                <p className="mt-1 text-xs text-muted">{p}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link href="/process" className="text-sm font-semibold text-brand hover:underline">See the full client journey →</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          <Card className="lg:col-span-1">
            <div className="text-sm font-bold text-ivory">Indicative cost range</div>
            {costLow && costHigh ? (
              <>
                <div className="mt-2 text-2xl font-extrabold text-brand">{inr(costLow)} – {inr(costHigh)}</div>
                <p className="mt-2 text-xs text-muted">
                  Based on {sqft(service.sizeMinSqft)} – {sqft(service.sizeMaxSqft)} at current package rates
                  (₹{minRate?.toLocaleString("en-IN")} – ₹{maxRate?.toLocaleString("en-IN")}/sqft). Run the Cost
                  Estimator for a figure specific to your plot.
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Package rates unavailable — try the Cost Estimator directly.</p>
            )}
            <Link href="/cost-estimator" className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center font-semibold text-white">
              Get an instant estimate
            </Link>
          </Card>

          <div className="lg:col-span-2">
            <div className="text-sm font-bold text-ivory">Frequently asked questions</div>
            {relevantFaqs.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No FAQs published for this yet — see the <Link href="/faq" className="text-brand hover:underline">full FAQ page</Link> or{" "}
                <Link href="/contact" className="text-brand hover:underline">ask us directly</Link>.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {relevantFaqs.map((f: any) => (
                  <details key={f.id} className="rounded-xl2 border border-border bg-card p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-ivory">{f.question}</summary>
                    <p className="mt-2 text-sm text-muted">{f.answer}</p>
                  </details>
                ))}
              </div>
            )}
            <Link href="/faq" className="mt-3 inline-block text-xs font-semibold text-brand hover:underline">See all FAQs →</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="mb-6 text-xl font-bold text-ivory">Related projects</h2>
          {relatedProjects.length === 0 ? (
            <div className="rounded-xl2 border border-dashed border-border p-8 text-center text-sm text-muted">
              We haven&apos;t published a {service.title.toLowerCase()} project yet — browse{" "}
              <Link href="/projects" className="text-brand hover:underline">all past projects</Link> instead.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProjects.map((p: any) => (
                <Link key={p.id} href={`/projects/${p.slug}`}>
                  <Card className="h-full transition-colors hover:border-brand/50">
                    <div className="text-xs uppercase tracking-wide text-brand">{p.city} · {p.completion_year}</div>
                    <div className="mt-1 text-lg font-bold text-ivory">{p.name}</div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                      <span>{sqft(p.builtup_area_sqft)}</span>
                      <span>~{inr(p.approx_cost)}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">Ready to plan your {service.title.toLowerCase()}?</div>
            <p className="mt-1 text-sm text-muted">Get an indicative cost and timeline, or talk to our team directly. No surprises, at any stage.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/cost-estimator" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Cost Estimator</Link>
            <Link href="/enquiry" className="rounded-lg border border-border px-5 py-3 font-semibold text-sand hover:bg-card">Enquiry</Link>
          </div>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
