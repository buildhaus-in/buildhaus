import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { inr, sqft } from "@buildhaus/utils";
import { EmptyState } from "@buildhaus/ui";
import { Card } from "@buildhaus/ui";

export default async function ProjectsPage() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("public_projects")
    .select("id,slug,name,city,project_type,builtup_area_sqft,approx_cost,cost_per_sqft,completion_year,package,duration_months")
    .eq("is_public", true)
    .order("is_featured", { ascending: false })
    .order("completion_year", { ascending: false });

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">Our portfolio</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          Proof, not promises.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          Completed and in-progress work across Hyderabad &amp; Nellore. Every project is tracked
          stage by stage with documented quality checks — some clients choose to make that record
          public, so you can judge our standard for yourself.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        {(!projects || projects.length === 0) ? (
          <EmptyState title="No public projects yet" hint="Projects will appear here once the Owner publishes them." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p: any) => (
              <Link key={p.id} href={`/projects/${p.slug}`}>
                <Card className="h-full transition hover:border-brand/60">
                  <div className="text-xs uppercase tracking-wide text-brand">{p.project_type} · {p.package}</div>
                  <div className="mt-1 text-lg font-bold text-ivory">{p.name}</div>
                  <div className="text-sm text-muted">{p.city} · {p.completion_year}</div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                    <span>{sqft(p.builtup_area_sqft)}</span>
                    <span>~{inr(p.approx_cost)}</span>
                    {p.cost_per_sqft && <span>₹{p.cost_per_sqft}/sqft</span>}
                  </div>
                  {p.duration_months && <div className="mt-2 text-xs text-muted">Delivered in {p.duration_months} months</div>}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <PublicFooter />
    </main>
  );
}
