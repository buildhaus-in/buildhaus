"use client";
import { useFormState, useFormStatus } from "react-dom";
import { Input, Select } from "@buildhaus/ui";
import { Button, Card } from "@buildhaus/ui";
import { submitCallbackRequest, CallbackState } from "./actions";

const PREFERRED_TIMES = [
  { value: "morning", label: "Morning (9 AM – 12 PM)" },
  { value: "afternoon", label: "Afternoon (12 PM – 4 PM)" },
  { value: "evening", label: "Evening (4 PM – 7 PM)" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <><span className="spinner" /> Requesting…</> : "Request a Callback"}
    </Button>
  );
}

export function CallbackForm() {
  const [state, formAction] = useFormState<CallbackState, FormData>(submitCallbackRequest, null);

  if (state && "ok" in state) {
    return (
      <Card className="border-ok/40 bg-ok/10 text-center">
        <div className="text-lg font-bold text-ivory">Callback requested.</div>
        <p className="mt-2 text-sm text-sand">
          Our team will call you during your preferred window — exactly as requested. In the
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
        <Select label="Preferred time to call" name="preferred_time" required defaultValue="">
          <option value="" disabled>Select a time window</option>
          {PREFERRED_TIMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
        {state && "error" in state && (
          <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{state.error}</div>
        )}
        <Submit />
      </form>
    </Card>
  );
}
