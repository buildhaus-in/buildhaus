import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { EnquiryForm } from "./enquiry-form";

export default function EnquiryPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-2xl px-5 py-14">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">Enquiry</div>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ivory sm:text-4xl">
          Tell us about the home you envision.
        </h1>
        <p className="mt-3 text-sand">
          A quick note is enough to begin — our team will call you back to understand your plot,
          your timeline and what you want to build. A conversation, not a pitch.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <EnquiryForm />
      </section>

      <PublicFooter />
    </main>
  );
}
