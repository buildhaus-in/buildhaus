import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card } from "@buildhaus/ui";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">Contact us</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          Start with one conversation.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          Whether you have a plot ready in Hyderabad or Nellore, or are still comparing options,
          our team will walk you through packages, timelines and next steps — clearly, and without
          the hard sell.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Office</div>
            <div className="mt-2 text-sm text-ivory">Buildhaus Constructions</div>
            <div className="mt-1 text-sm text-muted">Nellore &amp; Hyderabad</div>
            <div className="mt-1 text-xs text-muted">Serving Andhra Pradesh &amp; Telangana</div>
          </Card>
          <Card>
            <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Phone & WhatsApp</div>
            <div className="mt-2 text-sm text-ivory">
              <a href="tel:+917328573826" className="hover:text-brand">+91 73285 73826</a>
            </div>
            <div className="mt-1 text-xs text-muted">Mon–Sat, 9:30 AM – 6:30 PM IST</div>
          </Card>
          <Card>
            <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight">Email</div>
            <div className="mt-2 text-sm text-ivory">hello@buildhaus.example</div>
            <div className="mt-1 text-xs text-muted">We usually reply within one business day.</div>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="text-lg font-bold text-ivory">Have a quick question?</div>
              <p className="mt-1 text-sm text-muted">Send us your requirement and we&apos;ll call you back — no site visit needed yet.</p>
              <Link href="/enquiry" className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-white">Send an enquiry</Link>
            </Card>
            <Card>
              <div className="text-lg font-bold text-ivory">Ready to see your plot?</div>
              <p className="mt-1 text-sm text-muted">Book a site visit and our team will assess your plot in person.</p>
              <Link href="/request-site-visit" className="mt-4 inline-block rounded-lg border border-border px-5 py-2.5 font-semibold text-sand hover:bg-card">Request a site visit</Link>
            </Card>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
