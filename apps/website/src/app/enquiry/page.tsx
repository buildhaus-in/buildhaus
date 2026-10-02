import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { PageHero } from "@/components/public/page-hero";
import { MrHaus } from "@/components/public/mr-haus";
import { EnquiryForm } from "./enquiry-form";

export default function EnquiryPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      {/* Mr Haus greets the enquiry form — see the same treatment on
          /cost-estimator; these are the two highest-intent pages. */}
      <PageHero
        width="2xl"
        eyebrow="Enquiry"
        title="Tell us about the home you envision."
        lead={<>A quick note is enough to begin — our team will call you back to understand your plot,
          your timeline and what you want to build. A conversation, not a pitch.</>}
        aside={<MrHaus className="h-36 self-end sm:h-44 lg:h-52" />}
      />

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <EnquiryForm />
      </section>

      <PublicFooter />
    </main>
  );
}
