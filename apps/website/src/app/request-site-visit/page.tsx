import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { SiteVisitForm } from "./site-visit-form";

export default function RequestSiteVisitPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-2xl px-5 py-14">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">Request a site visit</div>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ivory sm:text-4xl">
          Every considered design starts at the plot.
        </h1>
        <p className="mt-3 text-sand">
          A site visit lets us assess soil, access, orientation and Vastu alignment before any
          design or number is put in front of you. Pick a date that works for you.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <SiteVisitForm />
      </section>

      <PublicFooter />
    </main>
  );
}
