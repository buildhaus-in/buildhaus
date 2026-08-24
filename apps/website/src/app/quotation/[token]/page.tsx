import Link from "next/link";
import { createAdminClient } from "@buildhaus/database";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card, Badge, StatCard, EmptyState, Button } from "@buildhaus/ui";
import { inr, inrFull, sqft, dateLabel } from "@buildhaus/utils";
import { PrintButtons, QuotationRequestActions } from "./quotation-actions";

// Public quotation links are looked up by an unguessable token (never the
// raw quotations.id) from quotation_public_tokens. A missing, revoked or
// expired token all render the exact same "invalid or expired" state below —
// deliberately not distinguishing which, so the page never leaks whether a
// given token string ever existed.
function InvalidOrExpired() {
  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />
      <section className="mx-auto max-w-2xl px-5 py-20">
        <EmptyState
          title="This quotation link has expired"
          hint="Public quotation links are valid for a limited time. Please run a fresh estimate, or contact us and we'll resend your quotation."
          action={
            <Link href="/cost-estimator">
              <Button>Get a new estimate</Button>
            </Link>
          }
        />
      </section>
      <PublicFooter />
    </main>
  );
}

export default async function PublicQuotationPage({ params }: { params: { token: string } }) {
  // Service context: quotations/quotation_versions/leads/material_catalogue
  // have no anon SELECT policy (owner-only under 0010), and this page serves
  // anonymous visitors. Because this client bypasses RLS, the revoked/expired
  // checks below are the ONLY gate — they must never be removed or the page
  // would happily serve revoked and expired links.
  const supabase = createAdminClient();

  const { data: tokenRow } = await supabase
    .from("quotation_public_tokens")
    .select("*")
    .eq("token", params.token)
    .maybeSingle();

  const isExpired = tokenRow?.expires_at ? new Date(tokenRow.expires_at).getTime() < Date.now() : false;
  if (!tokenRow || tokenRow.revoked || isExpired) {
    return <InvalidOrExpired />;
  }

  const { data: quotation } = await supabase.from("quotations").select("*").eq("id", tokenRow.quotation_id).maybeSingle();
  if (!quotation) {
    return <InvalidOrExpired />;
  }

  const { data: version } = await supabase
    .from("quotation_versions")
    .select("*")
    .eq("quotation_id", quotation.id)
    .eq("version", quotation.current_version ?? 1)
    .maybeSingle();

  const lead = quotation.lead_id
    ? (await supabase.from("leads").select("*").eq("id", quotation.lead_id).maybeSingle()).data
    : null;

  const { data: materials } = await supabase
    .from("material_catalogue")
    .select("name,unit,spec")
    .limit(6);

  const specs = version?.specifications ?? {};
  const customer = specs.customer ?? {};
  const breakdown: any[] = specs.breakdown ?? [];
  const timelineStages: any[] = specs.timeline_stages ?? [];
  const assumptions: string[] = specs.assumptions ?? [];
  const optionalItems: any[] = version?.optional_items ?? [];
  const paymentSchedule: any[] = version?.payment_schedule ?? [];
  const inclusions: string[] = version?.inclusions ?? [];
  const exclusions: string[] = version?.exclusions ?? [];

  const customerName = customer.name ?? lead?.customer_name ?? "—";
  const customerMobile = customer.mobile ?? lead?.mobile ?? "—";
  const customerWhatsapp = customer.whatsapp ?? customerMobile;
  const customerEmail = customer.email ?? lead?.email ?? "—";
  const siteLocation = customer.site_location ?? lead?.site_location ?? "—";
  const city = customer.city ?? lead?.city ?? "";
  const state = customer.state ?? lead?.state ?? "";

  return (
    <main className="min-h-screen bg-bg text-ink">
      <PublicHeader />

      <section className="mx-auto max-w-4xl px-5 py-10 print:py-4">
        <div className="rounded-xl2 border border-border bg-card p-6 print:border-black print:bg-white print:text-black sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5 print:border-black">
            <div>
              <div className="text-xl font-black tracking-tight text-brand print:text-black">BUILDHAUS</div>
              <div className="text-[10px] tracking-widest text-muted print:text-black">CONSTRUCTION, END TO END · NELLORE, AP</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-muted print:text-black">Quotation Ref</div>
              <div className="text-lg font-bold text-ivory print:text-black">{quotation.quotation_no}</div>
              <div className="mt-1"><Badge tone="brand">{quotation.status}</Badge></div>
            </div>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight print:text-black">Customer</div>
              <div className="mt-2 space-y-1 text-sm text-sand print:text-black">
                <div>{customerName}</div>
                <div>{customerMobile}{customerWhatsapp && customerWhatsapp !== customerMobile ? ` · WhatsApp: ${customerWhatsapp}` : ""}</div>
                <div>{customerEmail}</div>
                <div>{siteLocation}{city ? `, ${city}` : ""}{state ? `, ${state}` : ""}</div>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-sandlight print:text-black">Quotation details</div>
              <div className="mt-2 space-y-1 text-sm text-sand print:text-black">
                <div>Generated: {dateLabel(quotation.created_at)}</div>
                <div>Valid until: {dateLabel(quotation.valid_until)}</div>
                <div>Package: {version?.package ?? "—"}</div>
                <div>Building type: {version?.project_type ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <StatCard label="Built-up area" value={sqft(version?.builtup_area_sqft)} tone="sand" />
            {version?.plot_area_sqft && <StatCard label="Plot area" value={sqft(version.plot_area_sqft)} tone="sand" />}
            {version?.floors && <StatCard label="Floors" value={version.floors} tone="sand" />}
            <StatCard label="Total indicative cost" value={inr(version?.total_cost)} tone="brand" />
            <StatCard label="Cost / sqft" value={`₹${Number(version?.cost_per_sqft ?? 0).toLocaleString("en-IN")}`} tone="sand" />
            <StatCard label="Approx. duration" value={version?.timeline ?? "—"} tone="sand" />
          </div>

          <div className="mt-8">
            <div className="text-sm font-bold text-ivory print:text-black">Cost breakdown</div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <tbody>
                  {breakdown.map((b) => (
                    <tr key={b.component} className="border-b border-border last:border-0 print:border-black/20">
                      <td className="py-2 text-sand print:text-black">{b.label}</td>
                      <td className="py-2 text-right text-muted print:text-black">{b.percent}%</td>
                      <td className="py-2 text-right font-semibold text-ivory print:text-black">{inrFull(b.amount)}</td>
                    </tr>
                  ))}
                  {optionalItems.map((o) => (
                    <tr key={o.key} className="border-b border-border last:border-0 print:border-black/20">
                      <td className="py-2 text-sand print:text-black">{o.label} <span className="text-xs text-muted print:text-black">(optional)</span></td>
                      <td className="py-2 text-right text-muted print:text-black">+{o.markupPercent}%</td>
                      <td className="py-2 text-right font-semibold text-ivory print:text-black">{inrFull(o.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="pt-3 text-sm font-bold text-ivory print:text-black">Total</td>
                    <td />
                    <td className="pt-3 text-right text-sm font-bold text-brand print:text-black">{inrFull(version?.total_cost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {timelineStages.length > 0 && (
            <div className="mt-8">
              <div className="text-sm font-bold text-ivory print:text-black">Stage-wise indicative timeline</div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted print:text-black">
                      <th className="pb-2">Stage</th>
                      <th className="pb-2 text-right">Duration</th>
                      <th className="pb-2 text-right">Approx window</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineStages.map((t) => (
                      <tr key={t.name} className="border-b border-border last:border-0 print:border-black/20">
                        <td className="py-1.5 text-sand print:text-black">{t.name}</td>
                        <td className="py-1.5 text-right text-muted print:text-black">{t.months} mo</td>
                        <td className="py-1.5 text-right text-xs text-muted print:text-black">{dateLabel(t.startDate)} – {dateLabel(t.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {paymentSchedule.length > 0 && (
            <div className="mt-8">
              <div className="text-sm font-bold text-ivory print:text-black">Suggested payment schedule</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {paymentSchedule.map((p) => (
                  <div key={p.milestone} className="rounded-lg border border-border bg-surface p-3 text-center print:border-black/30 print:bg-white">
                    <div className="text-xs text-muted print:text-black">{p.milestone}</div>
                    <div className="mt-1 text-sm font-bold text-brand print:text-black">{p.percent}%</div>
                    <div className="text-xs text-sand print:text-black">{inr(p.amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm font-bold text-ivory print:text-black">Inclusions</div>
              <ul className="mt-2 space-y-1.5">
                {inclusions.map((i) => <li key={i} className="text-sm text-sand print:text-black">✓ {i}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-sm font-bold text-ivory print:text-black">Exclusions</div>
              <ul className="mt-2 space-y-1.5">
                {exclusions.map((e) => <li key={e} className="text-sm text-muted print:text-black">✕ {e}</li>)}
              </ul>
            </div>
          </div>

          {materials && materials.length > 0 && (
            <div className="mt-8">
              <div className="text-sm font-bold text-ivory print:text-black">Material specification highlights</div>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {materials.map((m: any) => (
                  <li key={m.name} className="text-xs text-muted print:text-black">
                    <span className="text-sand print:text-black">{m.name}</span> — {m.spec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assumptions.length > 0 && (
            <div className="mt-8">
              <div className="text-sm font-bold text-ivory print:text-black">Assumptions</div>
              <ul className="mt-2 space-y-1 text-xs text-muted print:text-black">
                {assumptions.map((a) => <li key={a}>• {a}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-8 rounded-lg border border-border bg-surface p-4 text-xs text-muted print:border-black print:bg-white print:text-black">
            This quotation is an indicative estimate generated from the information provided by the customer.
            Final pricing will be confirmed after site inspection, soil assessment, approved drawings, detailed
            specifications, local market rates and BOQ preparation. This document is not a final construction agreement.
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <PrintButtons pdfHref={`/quotation/${params.token}/pdf`} />
          <Card className="print:hidden">
            <div className="mb-4 text-sm font-bold text-ivory">Want to move forward?</div>
            <QuotationRequestActions leadId={quotation.lead_id} quotationNo={quotation.quotation_no} />
          </Card>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
