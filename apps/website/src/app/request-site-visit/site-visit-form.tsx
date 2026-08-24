"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Input, Textarea, Select } from "@buildhaus/ui";
import { Button, Card } from "@buildhaus/ui";
import { submitSiteVisitRequest, SiteVisitState } from "./actions";

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
      {pending ? <><span className="spinner" /> Scheduling…</> : "Request Site Visit"}
    </Button>
  );
}

export function SiteVisitForm() {
  const [state, formAction] = useFormState<SiteVisitState, FormData>(submitSiteVisitRequest, null);

  if (state && "ok" in state) {
    return (
      <Card className="border-ok/40 bg-ok/10 text-center">
        <div className="text-lg font-bold text-ivory">Site visit requested.</div>
        <p className="mt-2 text-sm text-sand">
          Our team will call to confirm the exact time — you won&apos;t need to follow up. You can also{" "}
          <a href="/cost-estimator" className="text-brand hover:underline">get an indicative estimate</a> in the meantime.
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
        <Input label="Site location / address" name="site_location" required placeholder="e.g. Kokapet, Hyderabad or Podalakur Road, Nellore" />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Input label="City" name="city" defaultValue="Hyderabad" />
          <Input label="State" name="state" defaultValue="Telangana" />
        </div>
        <Select label="Building type (optional)" name="building_type" defaultValue="">
          <option value="">Not sure yet</option>
          {BUILDING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </Select>
        <Input label="Preferred visit date" name="preferred_date" type="date" required />
        <Textarea label="Notes (optional)" name="notes" placeholder="Anything our engineer should know before visiting — access instructions, best time of day, etc." />
        {state && "error" in state && (
          <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</div>
        )}
        <Submit />
      </form>
    </Card>
  );
}
