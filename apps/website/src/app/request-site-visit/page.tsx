import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { PageHero } from "@/components/public/page-hero";
import { SiteVisitForm } from "./site-visit-form";

export default function RequestSiteVisitPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <PageHero
        width="2xl"
        eyebrow="Request a site visit"
        title="Every considered design starts at the plot."
        lead={<>A site visit lets us assess soil, access, orientation and Vastu alignment before any
          design or number is put in front of you. Pick a date that works for you.</>}
      />

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <SiteVisitForm />
      </section>

      <PublicFooter />
    </main>
  );
}
