import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { MrHaus } from "@/components/public/mr-haus";
import { EnquiryForm } from "./enquiry-form";

export default function EnquiryPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      {/* Mr Haus greets the enquiry form — see the same treatment on
          /cost-estimator; these are the two highest-intent pages. */}
      <section className="mx-auto flex max-w-2xl flex-col-reverse items-center gap-4 px-5 py-14 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand">Enquiry</div>
          <h1 className="mt-3 text-3xl font-black leading-tight text-ivory sm:text-4xl">
            Tell us about the home you envision.
          </h1>
          <p className="mt-3 text-sand">
            A quick note is enough to begin — our team will call you back to understand your plot,
            your timeline and what you want to build. A conversation, not a pitch.
          </p>
        </div>
        <MrHaus className="h-36 self-end sm:h-44 lg:h-52" />
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <EnquiryForm />
      </section>

      <PublicFooter />
    </main>
  );
}
