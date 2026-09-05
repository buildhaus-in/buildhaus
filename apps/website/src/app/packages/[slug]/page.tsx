import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card, Badge } from "@buildhaus/ui";
import { WEBSITE_URL } from "@/lib/env";
import { TIER_HUE } from "@/lib/palette";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: pkg } = await supabase
    .from("estimator_packages")
    .select("key,label,description,rate_per_sqft")
    .eq("key", params.slug)
    .maybeSingle();
  if (!pkg) return {};
  const title = `${pkg.label} Package`;
  const description = `${pkg.description} ₹${Number(pkg.rate_per_sqft).toLocaleString("en-IN")}/sqft.`;
  const url = `${WEBSITE_URL}/packages/${pkg.key}`;
  return {
    title,
    description,
    openGraph: { type: "website", title, description, url },
    twitter: { card: "summary", title, description },
    alternates: { canonical: url },
  };
}

export default async function PackageDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: packages, error } = await supabase
    .from("estimator_packages")
    .select("id,key,label,rate_per_sqft,description,series,best_for,highlights,specs,inclusions,exclusions")
    .order("rate_per_sqft", { ascending: true });
  if (error) throw new Error(`Couldn't load packages: ${error.message}`);

  const pkg = (packages ?? []).find((p: any) => p.key === params.slug);
  if (!pkg) notFound();

  // Per brand rules, Premium (Signature Series) is the default recommendation.
  const isRecommended = pkg.key === "premium";
  const hue = TIER_HUE[pkg.key] ?? TIER_HUE.premium;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: WEBSITE_URL },
      { "@type": "ListItem", position: 2, name: "Packages", item: `${WEBSITE_URL}/packages` },
      { "@type": "ListItem", position: 3, name: pkg.label, item: `${WEBSITE_URL}/packages/${pkg.key}` },
    ],
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${pkg.label} Construction Package — Buildhaus`,
    description: pkg.description,
    brand: { "@type": "Brand", name: "Buildhaus Constructions" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: Number(pkg.rate_per_sqft),
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: Number(pkg.rate_per_sqft),
        priceCurrency: "INR",
        unitText: "per sqft",
      },
      availability: "https://schema.org/InStock",
      url: `${WEBSITE_URL}/packages/${pkg.key}`,
    },
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <nav className="text-xs text-muted">
          <Link href="/" className="hover:text-sand">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/packages" className="hover:text-sand">Packages</Link>
          <span className="mx-1.5">/</span>
          <span className="text-sand">{pkg.label}</span>
        </nav>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${hue.text}`}>
            <span className={`h-2 w-2 rounded-full ${hue.dot}`} aria-hidden />
            {pkg.series ? `Construction package · ${pkg.series}` : "Construction package"}
          </div>
          {isRecommended && <Badge tone="brand">Recommended</Badge>}
        </div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          {pkg.label} package
        </h1>
        <p className="mt-4 max-w-xl text-sand">{pkg.description}</p>
        <div className={`mt-4 text-3xl font-extrabold ${hue.textStrong}`}>
          ₹{Number(pkg.rate_per_sqft).toLocaleString("en-IN")}<span className="text-base font-medium text-muted">/sqft</span>
        </div>
        <p className="mt-2 max-w-xl text-xs text-muted">
          A starting reference, never a final price — the final cost depends on plot size, floor
          count, design complexity and site conditions.
        </p>
        {(pkg.best_for ?? []).length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {(pkg.best_for ?? []).map((b: string) => (
              <span key={b} className={`rounded-full border ${hue.border} ${hue.bg} px-3 py-1 text-xs font-medium ${hue.text}`}>{b}</span>
            ))}
          </div>
        )}
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/cost-estimator?package=${pkg.key}`} className="rounded-lg bg-brand px-5 py-3 font-semibold text-black">
            Get an instant estimate
          </Link>
          <Link href={`/cost-estimator?package=${pkg.key}`} className="rounded-lg border border-border px-5 py-3 font-semibold text-sand hover:bg-card">
            Generate a quotation
          </Link>
          <Link href="/packages" className="rounded-lg border border-border px-5 py-3 font-semibold text-sand hover:bg-card">
            Compare all packages
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted">
          &ldquo;Generate a quotation&rdquo; takes you to the Cost Estimator, pre-selected on the {pkg.label} package —
          fill in your plot details there to get a shareable quotation reference.
        </p>
      </section>

      {(pkg.highlights ?? []).length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-10">
          <Card>
            <div className="text-sm font-bold text-ivory">Highlights</div>
            <ul className="mt-3 space-y-1.5">
              {(pkg.highlights ?? []).map((h: string) => (
                <li key={h} className="flex gap-2 text-sm text-sand">
                  <span className="text-ok">✓</span><span>{h}</span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {(pkg.specs ?? []).length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-16">
          <h2 className="mb-4 text-xl font-bold text-ivory">Material specification</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(pkg.specs ?? []).map((sec: any) => (
              <Card key={sec.section}>
                <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">{sec.section}</div>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {(sec.rows ?? []).map((row: any) => (
                      <tr key={row.item} className="border-b border-border last:border-0 align-top">
                        <td className="w-1/3 py-1.5 pr-3 text-muted">{row.item}</td>
                        <td className="py-1.5 text-sand">{row.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="text-sm font-bold text-ivory">What&apos;s included</div>
            <ul className="mt-3 space-y-1.5">
              {(pkg.inclusions ?? []).map((inc: string) => (
                <li key={inc} className="flex gap-2 text-sm text-sand">
                  <span className="text-ok">✓</span><span>{inc}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="text-sm font-bold text-ivory">What&apos;s not included</div>
            <ul className="mt-3 space-y-1.5">
              {(pkg.exclusions ?? []).map((exc: string) => (
                <li key={exc} className="flex gap-2 text-sm text-muted">
                  <span className="text-danger">✕</span><span>{exc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Excluded items can be quoted separately on request — see{" "}
              <Link href="/materials" className="text-brand hover:underline">material specifications</Link> for detail
              on what each category covers.
            </p>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="mb-6 text-xl font-bold text-ivory">Compare with other packages</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(packages ?? []).map((p: any) => {
              const h = TIER_HUE[p.key] ?? TIER_HUE.premium;
              return (
              <Link key={p.id} href={`/packages/${p.key}`}>
                <Card className={`h-full border-t-4 ${h.borderT} transition-colors hover:brightness-95`}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-ivory">{p.label}</div>
                    {p.key === pkg.key && <Badge tone="brand">Viewing</Badge>}
                  </div>
                  <div className={`mt-2 text-lg font-extrabold ${h.textStrong}`}>
                    ₹{Number(p.rate_per_sqft).toLocaleString("en-IN")}<span className="text-xs font-medium text-muted">/sqft</span>
                  </div>
                  <p className="mt-2 text-xs text-muted">{p.description}</p>
                </Card>
              </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">Want an exact figure for your plot?</div>
            <p className="mt-1 text-sm text-muted">Run the {pkg.label} package through the Cost Estimator for a full cost and timeline breakdown.</p>
          </div>
          <Link href={`/cost-estimator?package=${pkg.key}`} className="rounded-lg bg-brand px-5 py-3 font-semibold text-black">
            Get an instant quotation
          </Link>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
