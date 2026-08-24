import type { Metadata } from "next";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { CallbackForm } from "./callback-form";

export const metadata: Metadata = {
  title: "Request a Callback",
  description: "Leave your number and preferred time — our team will call you back to discuss your build.",
};

export default function RequestCallbackPage() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-2xl px-5 py-14">
        <div className="text-xs font-bold uppercase tracking-widest text-brand">Request a callback</div>
        <h1 className="mt-3 text-3xl font-black leading-tight text-ivory sm:text-4xl">
          Prefer a call over a form?
        </h1>
        <p className="mt-3 text-sand">
          Leave your number and the best time to reach you. One call, at the time you chose, to
          understand your requirement — nothing more until you ask for it.
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <CallbackForm />
      </section>

      <PublicFooter />
    </main>
  );
}
