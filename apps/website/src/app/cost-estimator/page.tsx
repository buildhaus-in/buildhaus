import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { PageHero } from "@/components/public/page-hero";
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
      <PageHero
        width="3xl"
        eyebrow="Cost Estimator"
        title="Get an indicative cost for your build in minutes."
        lead={<>Tell us about your plot and requirements — we&apos;ll show you a full cost breakdown,
          stage-wise timeline and suggested payment schedule, driven by our current package rates.</>}
        aside={<MrHaus className="h-36 self-end sm:h-44 lg:h-56" />}
      />

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
