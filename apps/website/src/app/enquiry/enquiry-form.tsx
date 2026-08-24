"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Input, Textarea, Select } from "@buildhaus/ui";
import { Button, Card } from "@buildhaus/ui";
import { submitEnquiry, EnquiryState } from "./actions";

const BUILDING_TYPES = [
  { value: "independent_house", label: "Independent House" },
  { value: "villa", label: "Villa" },
  { value: "duplex", label: "Duplex" },
  { value: "apartment", label: "Apartment" },
  { value: "commercial", label: "Commercial" },
  { value: "warehouse", label: "Warehouse / Industrial" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <><span className="spinner" /> Sending…</> : "Send Enquiry"}
    </Button>
  );
}

export function EnquiryForm() {
  const [state, formAction] = useFormState<EnquiryState, FormData>(submitEnquiry, null);

  if (state && "ok" in state) {
    return (
      <Card className="border-ok/40 bg-ok/10 text-center">
        <div className="text-lg font-bold text-ivory">Thanks — we&apos;ve got your enquiry.</div>
        <p className="mt-2 text-sm text-sand">
          Our team will call you back within 24 hours — you won&apos;t need to chase us. In the
          meantime, the{" "}
          <a href="/cost-estimator" className="text-brand hover:underline">Cost Estimator</a> gives
          you an indicative price for your build.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <form action={formAction}>
        <Input label="Full name" name="name" required placeholder="e.g. Ramesh Kumar" />
        <Input label="Mobile number" name="mobile" required />
        <Input label="Email (optional)" name="email" type="email" placeholder="you@example.com" />
        <Input label="Site location" name="site_location" required placeholder="e.g. Kokapet, Hyderabad or Podalakur Road, Nellore" />
        <Input label="City" name="city" defaultValue="Hyderabad" />
        <Select label="Building type (optional)" name="building_type" defaultValue="">
          <option value="">Not sure yet</option>
          {BUILDING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </Select>
        <Textarea label="What are you looking to build?" name="requirement" placeholder="Your plot, your budget, your timeline — whatever you know so far is enough." />
        {state && "error" in state && (
          <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</div>
        )}
        <Submit />
      </form>
    </Card>
  );
}
