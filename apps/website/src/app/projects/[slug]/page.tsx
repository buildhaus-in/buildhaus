import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card, StatCard, Badge } from "@buildhaus/ui";
import { sqft } from "@buildhaus/utils";
import { WEBSITE_URL } from "@/lib/env";
import { hueForProjectType, projectTypeLabel } from "@/lib/palette";
import { PageHero } from "@/components/public/page-hero";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("public_projects")
    .select("description,project_type,city,completion_year")
    .eq("slug", params.slug)
    .eq("is_public", true)
    .maybeSingle();
  if (!project) return {};
  // Never the project's name — that's the client's family name.
  const title = `${projectTypeLabel(project.project_type)} in ${project.city}`;
  const description =
    project.description ||
    `A ${project.project_type} project in ${project.city}${project.completion_year ? `, completed ${project.completion_year}` : ""}.`;
  const url = `${WEBSITE_URL}/projects/${params.slug}`;
  return {
    title,
    description,
    openGraph: { type: "website", title, description, url },
    twitter: { card: "summary", title, description },
    alternates: { canonical: url },
  };
}

export default async function ProjectDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: project } = await supabase
    .from("public_projects")
    .select("*")
    .eq("slug", params.slug)
    .eq("is_public", true)
    .maybeSingle();

  if (!project) notFound();
  const hue = hueForProjectType(project.project_type);
  // Public label: build type + city. The `name` column holds the client's
  // family name ("… Residence") and must not be shown anywhere public.
  const typeLabel = projectTypeLabel(project.project_type);
  const displayName = `${typeLabel} in ${project.city}`;

  const { data: gallery } = await supabase
    .from("project_gallery")
    .select("*")
    .eq("public_project_id", project.id)
    .order("sort_order", { ascending: true });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: WEBSITE_URL },
      { "@type": "ListItem", position: 2, name: "Projects", item: `${WEBSITE_URL}/projects` },
      { "@type": "ListItem", position: 3, name: displayName, item: `${WEBSITE_URL}/projects/${project.slug}` },
    ],
  };

  const projectJsonLd = {
    "@context": "https://schema.org",
    "@type": "House",
    name: displayName,
    description: project.description,
    // Region follows the project's city: Hyderabad sits in Telangana, the
    // rest of the current portfolio in Andhra Pradesh.
    address: {
      "@type": "PostalAddress",
      addressLocality: project.city,
      addressRegion: project.city === "Hyderabad" ? "Telangana" : "Andhra Pradesh",
      addressCountry: "IN",
    },
    floorSize: project.builtup_area_sqft ? { "@type": "QuantitativeValue", value: project.builtup_area_sqft, unitCode: "FTK" } : undefined,
    numberOfRooms: project.floors ?? undefined,
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }} />

      <PageHero
        eyebrow={<>{typeLabel}{project.package && <> · {project.package} package</>}</>}
        title={displayName}
        lead={project.description}
        above={<Link href="/projects" className="font-semibold text-brand hover:underline">← All projects</Link>}
      >
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/70">
          {project.location && <span className="rounded-full border border-white/20 px-2.5 py-1">{project.location}</span>}
          <span className="rounded-full border border-white/20 px-2.5 py-1">{project.city}{project.completion_year && <> · {project.completion_year}</>}</span>
        </div>
      </PageHero>

      <section className="border-y border-border bg-sky-soft">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-5 py-8">
          <StatCard label="Built-up area" value={sqft(project.builtup_area_sqft)} tone="sand" />
          {project.plot_area_sqft && <StatCard label="Plot area" value={sqft(project.plot_area_sqft)} tone="sand" />}
          {project.floors && <StatCard label="Floors" value={project.floors} tone="sand" />}
          {project.duration_months && <StatCard label="Duration" value={`${project.duration_months} months`} tone="sand" />}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="mb-6 text-xl font-bold text-ivory">Build gallery</h2>
        {(!gallery || gallery.length === 0) ? (
          <div className="rounded-xl2 border border-dashed border-border p-8 text-center text-sm text-muted">
            Photos for this project haven&apos;t been published yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((g: any) => (
              <div key={g.id} className="rounded-xl2 border border-border bg-card p-5">
                <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-surface text-xs text-muted">
                  Photo — {g.caption}
                </div>
                <div className="mt-3 text-sm font-semibold text-ivory">{g.caption}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-brand">{String(g.stage).replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {project.testimonial && (
        <section className="border-y border-border bg-sky-soft">
          <div className="mx-auto max-w-3xl px-5 py-14 text-center">
            <div className="text-3xl text-brand">&ldquo;</div>
            <p className="text-lg text-sandlight">{project.testimonial}</p>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-5 py-14">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">Envisioning something like this?</div>
            <p className="mt-1 text-sm text-muted">Get an indicative cost and timeline for your own plot in minutes — nothing hidden.</p>
          </div>
          <Link href={`/cost-estimator?package=${project.package}`} className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Get a similar quote</Link>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
