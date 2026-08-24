"use client";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Input, Textarea, Select } from "@buildhaus/ui";
import { Button, Card, StatCard } from "@buildhaus/ui";
import { inr, inrFull, dateLabel } from "@buildhaus/utils";
import { computeEstimate, generateQuotation, ComputeState, RawEstimateInputs } from "./actions";
import { OPTIONAL_WORKS } from "@buildhaus/utils";

const BUILDING_TYPES = [
  { value: "independent_house", label: "Independent House" },
  { value: "villa", label: "Villa" },
  { value: "duplex", label: "Duplex" },
  { value: "apartment", label: "Apartment" },
  { value: "commercial", label: "Commercial" },
  { value: "warehouse", label: "Warehouse / Industrial" },
];

interface PackageOption { key: string; label: string; rate_per_sqft: number; description: string }

function EstimateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <><span className="spinner" /> Calculating…</> : "Get My Estimate"}
    </Button>
  );
}

function GenerateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <><span className="spinner" /> Generating…</> : "Generate My Quotation →"}
    </Button>
  );
}

export function EstimatorForm({ packages, defaultPackageKey }: { packages: PackageOption[]; defaultPackageKey?: string }) {
  const [state, formAction] = useFormState<ComputeState, FormData>(computeEstimate, null);
  const [generateState, generateAction] = useFormState<ComputeState, FormData>(generateQuotation, null);
  const [sameAsMobile, setSameAsMobile] = useState(true);
  const [mobile, setMobile] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const result = state && "result" in state ? state.result : null;
  const inputs: RawEstimateInputs | null = state && "inputs" in state ? state.inputs : null;
  const error = state && "error" in state ? state.error : (generateState && "error" in generateState ? generateState.error : null);

  // Premium is the brand's default recommendation, so it wins the fallback
  // when the visitor didn't arrive with an explicit ?package= choice.
  const defaultPkg =
    defaultPackageKey && packages.some((p) => p.key === defaultPackageKey)
      ? defaultPackageKey
      : packages.find((p) => p.key === "premium")?.key ?? packages[0]?.key;

  const hiddenFields = useMemo(() => {
    if (!inputs) return null;
    return Object.entries(inputs) as [keyof RawEstimateInputs, string][];
  }, [inputs]);

  return (
    <div className="space-y-8">
      <Card>
        <form action={formAction} className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div className="sm:col-span-2 text-sm font-bold text-ivory">Your details</div>
          <Input label="Full name" name="name" required placeholder="e.g. Ramesh Kumar" />
          <Input
            label="Mobile number"
            name="mobile"
            required
           
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted">WhatsApp number</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-brand disabled:opacity-60"
                name="whatsapp"
               
                disabled={sameAsMobile}
                value={sameAsMobile ? mobile : whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
            <label className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={sameAsMobile} onChange={(e) => setSameAsMobile(e.target.checked)} />
              Same as mobile number
            </label>
          </div>
          <Input label="Email (optional)" name="email" type="email" placeholder="you@example.com" />

          <div className="sm:col-span-2 mt-3 text-sm font-bold text-ivory">Site details</div>
          <div className="sm:col-span-2">
            <Input label="Site location / address" name="site_location" required placeholder="e.g. Podalakur Road, Nellore" />
          </div>
          <Input label="City" name="city" required defaultValue="Nellore" />
          <Input label="State" name="state" required defaultValue="Andhra Pradesh" />
          <Input label="Plot width (ft)" name="plot_width" type="number" min="0" placeholder="e.g. 40" />
          <Input label="Plot length (ft)" name="plot_length" type="number" min="0" placeholder="e.g. 60" />

          <div className="sm:col-span-2 mt-3 text-sm font-bold text-ivory">Building details</div>
          <Select label="Building type" name="building_type" required defaultValue="">
            <option value="" disabled>Select building type</option>
            {BUILDING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </Select>
          <Input label="Number of floors" name="floors" type="number" min="1" defaultValue="2" required />
          <Input label="Built-up area per floor (sqft)" name="builtup_area_per_floor" type="number" min="0" placeholder="e.g. 1500" />
          <Input label="Total built-up area (sqft) — optional, overrides per-floor calc" name="builtup_area_sqft" type="number" min="0" placeholder="Leave blank to auto-calculate" />

          <div className="sm:col-span-2 mt-2">
            <label className="mb-2 block text-[11px] uppercase tracking-wide text-muted">Package</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((p) => (
                <label key={p.key} className="flex cursor-pointer flex-col gap-1 rounded-lg border border-border bg-surface p-3 has-[:checked]:border-brand">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ivory">
                    <input type="radio" name="package_key" value={p.key} defaultChecked={p.key === defaultPkg} required />
                    {p.label}
                    {p.key === "premium" && (
                      <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">Recommended</span>
                    )}
                  </span>
                  <span className="text-xs text-brand">₹{Number(p.rate_per_sqft).toLocaleString("en-IN")}/sqft</span>
                  <span className="text-xs text-muted">{p.description}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Package rates are a starting reference — the final cost depends on plot size, floor
              count, design complexity and site conditions.
            </p>
          </div>

          <div className="sm:col-span-2 mt-3">
            <label className="mb-2 block text-[11px] uppercase tracking-wide text-muted">Optional works</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {OPTIONAL_WORKS.map((w) => (
                <label key={w.key} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-sand">
                  <input type="checkbox" name="optional_works_item" value={w.key} />
                  {w.label}
                </label>
              ))}
            </div>
            <OptionalWorksHiddenField />
          </div>

          <Input label="Preferred start date" name="preferred_start_date" type="date" />
          <div className="sm:col-span-2">
            <Textarea label="Additional requirements" name="additional_requirements" placeholder="Anything specific you want us to know — vastu preferences, extra floor later, etc." />
          </div>

          {error && <div className="sm:col-span-2 mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</div>}
          <div className="sm:col-span-2 mt-2">
            <EstimateSubmit />
          </div>
        </form>
      </Card>

      {result && inputs && (
        <div className="space-y-6">
          <Card className="border-brand/50">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="text-sm font-bold uppercase tracking-wide text-sandlight">Indicative estimate — {result.packageLabel} package</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <StatCard label="Total indicative cost" value={inr(result.totalCost)} tone="brand" />
              <StatCard label="Cost per sqft" value={`₹${result.costPerSqft.toLocaleString("en-IN")}`} tone="sand" />
              <StatCard label="Built-up area" value={`${result.builtupAreaSqft.toLocaleString("en-IN")} sqft`} tone="sand" />
              <StatCard label="Indicative duration" value={`${result.totalMonths} months`} tone="sand" />
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-ivory">Cost breakdown</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <tbody>
                  {result.breakdown.map((b) => (
                    <tr key={b.component} className="border-b border-border last:border-0">
                      <td className="py-2 text-sand">{b.label}</td>
                      <td className="py-2 text-right text-muted">{b.percent}%</td>
                      <td className="py-2 text-right font-semibold text-ivory">{inrFull(b.amount)}</td>
                    </tr>
                  ))}
                  {result.optionalWorks.map((o) => (
                    <tr key={o.key} className="border-b border-border last:border-0">
                      <td className="py-2 text-sand">{o.label} <span className="text-xs text-muted">(optional)</span></td>
                      <td className="py-2 text-right text-muted">+{o.markupPercent}%</td>
                      <td className="py-2 text-right font-semibold text-ivory">{inrFull(o.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 text-sm font-bold text-ivory">Total</td>
                    <td />
                    <td className="pt-3 text-right text-sm font-bold text-brand">{inrFull(result.totalCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-ivory">Stage-wise indicative timeline</div>
            <div className="mt-3 max-h-72 overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="pb-2">Stage</th>
                    <th className="pb-2 text-right">Duration</th>
                    <th className="pb-2 text-right">Approx window</th>
                  </tr>
                </thead>
                <tbody>
                  {result.timeline.map((t) => (
                    <tr key={t.name} className="border-b border-border last:border-0">
                      <td className="py-1.5 text-sand">{t.name}</td>
                      <td className="py-1.5 text-right text-muted">{t.months} mo</td>
                      <td className="py-1.5 text-right text-xs text-muted">{dateLabel(t.startDate)} – {dateLabel(t.endDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-ivory">Suggested payment schedule</div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {result.paymentSchedule.map((p) => (
                <div key={p.milestone} className="rounded-lg border border-border bg-surface p-3 text-center">
                  <div className="text-xs text-muted">{p.milestone}</div>
                  <div className="mt-1 text-sm font-bold text-brand">{p.percent}%</div>
                  <div className="text-xs text-sand">{inr(p.amount)}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <div className="text-sm font-bold text-ivory">Package inclusions</div>
              <ul className="mt-3 space-y-1.5">
                {result.inclusions.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-sand"><span className="text-ok">✓</span><span>{i}</span></li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="text-sm font-bold text-ivory">Package exclusions</div>
              <ul className="mt-3 space-y-1.5">
                {result.exclusions.map((e) => (
                  <li key={e} className="flex gap-2 text-sm text-muted"><span className="text-danger">✕</span><span>{e}</span></li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <div className="text-sm font-bold text-ivory">Assumptions & disclaimers</div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted">
              {result.assumptions.map((a) => <li key={a}>• {a}</li>)}
            </ul>
          </Card>

          <form action={generateAction} className="flex flex-col items-start gap-3 rounded-xl2 border border-brand/50 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-ivory">Ready for a formal quotation?</div>
              <p className="mt-1 text-xs text-muted">We&apos;ll generate a shareable quotation with a reference number, valid for 30 days.</p>
            </div>
            {hiddenFields?.map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
            <GenerateSubmit />
          </form>
        </div>
      )}

      <p className="text-xs text-muted">
        Prefer to talk it through first? <Link href="/contact" className="text-brand hover:underline">Contact us</Link> or{" "}
        <Link href="/request-site-visit" className="text-brand hover:underline">request a site visit</Link>.
      </p>
    </div>
  );
}

// Serialises the checked "optional_works_item" checkboxes into a single
// comma-separated hidden field the server action reads as `optional_works`.
function OptionalWorksHiddenField() {
  const [csv, setCsv] = useState("");
  return (
    <input
      type="hidden"
      name="optional_works"
      value={csv}
      ref={(el) => {
        if (!el) return;
        const form = el.closest("form");
        if (!form) return;
        const handler = () => {
          const checked = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="optional_works_item"]:checked')).map((i) => i.value);
          const next = checked.join(",");
          if (next !== csv) setCsv(next);
        };
        form.addEventListener("change", handler);
      }}
    />
  );
}
