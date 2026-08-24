import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";

export default async function MaterialsPage() {
  const supabase = createClient();
  const { data: materials } = await supabase
    .from("material_catalogue")
    .select("id,name,unit,category,spec")
    .order("category", { ascending: true });

  const grouped = new Map<string, any[]>();
  for (const m of materials ?? []) {
    const cat = m.category ?? "General";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(m);
  }

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">Material specifications</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          Exactly what goes into your build.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          We standardise on ISI-certified, branded materials across every project, and we publish
          the specifications — because quality you can&apos;t verify is just a claim. The exact brand
          and grade within each category depends on your chosen package (Basic, Standard, Premium or Luxury).
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        {grouped.size === 0 ? (
          <EmptyState title="Material catalogue unavailable" hint="Specifications will appear here once configured." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from(grouped.entries()).map(([category, items]) => (
              <Card key={category}>
                <div className="text-sm font-bold text-brand">{category}</div>
                <ul className="mt-3 space-y-3">
                  {items.map((m) => (
                    <li key={m.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-ivory">{m.name}</span>
                        <span className="text-xs text-muted">per {m.unit}</span>
                      </div>
                      {m.spec && <div className="mt-0.5 text-xs text-muted">{m.spec}</div>}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-xl font-bold text-ivory">Checked, documented, then built</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Steel and cement deliveries are checked against mill test certificates on arrival.
            Sand and aggregate are checked for silt content before use, and every waterproofing
            application is validated with a ponding test before the next stage begins. Each check
            is documented — you see what was checked, what passed and what was resolved.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-bold text-ivory">See how specs change across packages</div>
            <p className="mt-1 text-sm text-muted">Compare inclusions and exclusions for Basic, Standard, Premium and Luxury — stated once, clearly.</p>
          </div>
          <Link href="/packages" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Compare packages</Link>
        </Card>
      </section>

      <PublicFooter />
    </main>
  );
}
