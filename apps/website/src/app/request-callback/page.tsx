import type { Metadata } from "next";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { PageHero } from "@/components/public/page-hero";
import { CallbackForm } from "./callback-form";

export const metadata: Metadata = {
  title: "Request a Callback",
  description: "Leave your number and preferred time — our team will call you back to discuss your build.",
};

export default function RequestCallbackPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <PageHero
        width="2xl"
        eyebrow="Request a callback"
        title="Prefer a call over a form?"
        lead={<>Leave your number and the best time to reach you. One call, at the time you chose, to
          understand your requirement — nothing more until you ask for it.</>}
      />

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <CallbackForm />
      </section>

      <PublicFooter />
    </main>
  );
}
