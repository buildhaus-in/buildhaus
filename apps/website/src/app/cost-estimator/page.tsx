import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { MrHaus } from "@/components/public/mr-haus";
import { EstimatorForm } from "./estimator-form";
import { EmptyState } from "@buildhaus/ui";

export default async function CostEstimatorPage({ searchParams }: { searchParams: { package?: string } }) {
  const supabase = createClient();
  const { data: packages, error } = await supabase
    .from("estimator_packages")
    .select("id,key,label,rate_per_sqft,description")
    .order("rate_per_sqft", { ascending: true });
  if (error) throw new Error(`Couldn't load packages: ${error.message}`);

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      {/* Mr Haus introduces the estimator — this and /enquiry are the two
          highest-intent pages, so the mascot earns his place here rather
          than only on the home page. He sits beside the copy from `sm` up
          and above it on a phone, so he never narrows the intro text. */}
      <section className="mx-auto flex max-w-3xl flex-col-reverse items-center gap-4 px-5 py-14 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand">Cost Estimator</div>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ivory sm:text-4xl">
            Get an indicative cost for your build in minutes.
          </h1>
          <p className="mt-3 text-sand">
            Tell us about your plot and requirements — we&apos;ll show you a full cost breakdown,
            stage-wise timeline and suggested payment schedule, driven by our current package rates.
          </p>
        </div>
        <MrHaus className="h-36 self-end sm:h-44 lg:h-56" />
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20">
        {(!packages || packages.length === 0) ? (
          <EmptyState title="Estimator unavailable" hint="Package rates haven't been configured yet — please check back soon." />
        ) : (
          <EstimatorForm packages={packages as any} defaultPackageKey={searchParams.package} />
        )}
      </section>

      <PublicFooter />
    </main>
  );
}
