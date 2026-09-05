import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card, EmptyState } from "@buildhaus/ui";
import { hueFor } from "@/lib/palette";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about cost & payments, timeline, our construction process and material quality at Buildhaus Constructions.",
};

export default async function FaqPage() {
  const supabase = createClient();
  const { data: faqs } = await supabase
    .from("faqs")
    .select("id,category,question,answer,display_order")
    .eq("is_published", true)
    .order("category", { ascending: true })
    .order("display_order", { ascending: true });

  const grouped = new Map<string, { id: string; question: string; answer: string }[]>();
  for (const f of faqs ?? []) {
    const list = grouped.get(f.category) ?? [];
    list.push(f);
    grouped.set(f.category, list);
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (faqs ?? []).map((f: any) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />
      {(faqs ?? []).length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">FAQ</div>
        <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-ivory sm:text-5xl">
          Ask us anything. Nothing hidden.
        </h1>
        <p className="mt-4 max-w-xl text-sand">
          Clear answers to the questions we hear most about cost, timeline, our process and material
          quality. Can&apos;t find what you need? <Link href="/contact" className="text-brand hover:underline">Contact us</Link> directly.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20">
        {grouped.size === 0 ? (
          <EmptyState title="FAQs unavailable" hint="Published questions will appear here once the Owner adds them." />
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([category, items], ci) => {
              const hue = hueFor(ci);
              return (
              <div key={category}>
                <h2 className={`mb-3 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide ${hue.text}`}>
                  <span className={`h-2 w-2 rounded-full ${hue.dot}`} aria-hidden />
                  {category}
                </h2>
                <div className={`overflow-hidden rounded-xl2 border-l-4 ${hue.borderL} border-y border-r border-border bg-card`}>
                  {items.map((f, i) => (
                    <details key={f.id} className={`group px-5 py-4 open:bg-surface/40 ${i > 0 ? "border-t border-border" : ""}`}>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ivory">
                        {f.question}
                        <span className={`shrink-0 ${hue.text} transition-transform group-open:rotate-45`}>+</span>
                      </summary>
                      <p className="mt-3 text-sm text-muted">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="text-lg font-bold text-ivory">Still have questions?</div>
              <p className="mt-1 text-sm text-muted">Send us an enquiry or request a callback at a time that suits you.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/enquiry" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white">Send an enquiry</Link>
              <Link href="/request-callback" className="rounded-lg border border-border px-5 py-3 font-semibold text-sand hover:bg-card">Request a callback</Link>
            </div>
          </Card>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
