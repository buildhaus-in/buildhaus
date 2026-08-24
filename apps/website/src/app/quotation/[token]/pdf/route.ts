import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@buildhaus/database";
import { QuotationDocument, type QuotationPdfData } from "@buildhaus/utils/pdf";

// Real, server-generated PDF binary (not a window.print() stand-in). Looked
// up by the same unguessable public token as the quotation page itself — a
// missing/revoked/expired token gets the same generic 404 as a token that
// never existed, so this endpoint doesn't leak which is which.
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  // Service context: the linked quotations/quotation_versions/leads/
  // material_catalogue rows have no anon SELECT policy (owner-only under
  // 0010). Bypasses RLS, so the revoked/expired checks below are the ONLY
  // gate on this endpoint — they must stay exactly as they are.
  const supabase = createAdminClient();

  const { data: tokenRow } = await supabase
    .from("quotation_public_tokens")
    .select("*")
    .eq("token", params.token)
    .maybeSingle();

  const isExpired = tokenRow?.expires_at ? new Date(tokenRow.expires_at).getTime() < Date.now() : false;
  if (!tokenRow || tokenRow.revoked || isExpired) {
    return new NextResponse("Quotation not found or link expired.", { status: 404 });
  }

  const { data: quotation } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", tokenRow.quotation_id)
    .maybeSingle();
  if (!quotation) {
    return new NextResponse("Quotation not found or link expired.", { status: 404 });
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

  const specs: any = version?.specifications ?? {};
  const customer = specs.customer ?? {};
  // Two quotation "shapes" exist: estimator-generated quotations carry a
  // percent-based `specifications.breakdown`; older/manual ones only set the
  // flat material/labour/design/taxes columns. Render whichever is populated
  // (same fallback as the owner-side download route) so neither shape gets
  // an empty cost table.
  const specBreakdown: any[] = specs.breakdown ?? [];
  const total = Number(version?.total_cost ?? 0);
  const pct = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);
  const legacyBreakdown = [
    { label: "Material cost", percent: pct(Number(version?.material_cost ?? 0)), amount: Number(version?.material_cost ?? 0) },
    { label: "Labour cost", percent: pct(Number(version?.labour_cost ?? 0)), amount: Number(version?.labour_cost ?? 0) },
    { label: "Design cost", percent: pct(Number(version?.design_cost ?? 0)), amount: Number(version?.design_cost ?? 0) },
    { label: "Taxes", percent: pct(Number(version?.taxes ?? 0)), amount: Number(version?.taxes ?? 0) },
  ].filter((line) => line.amount > 0);
  const timelineStages: any[] = specs.timeline_stages ?? [];
  const assumptions: string[] = specs.assumptions ?? [];
  const optionalItems: any[] = version?.optional_items ?? [];
  const paymentSchedule: any[] = version?.payment_schedule ?? [];
  const inclusions: string[] = version?.inclusions ?? [];
  const exclusions: string[] = version?.exclusions ?? [];

  const data: QuotationPdfData = {
    quotationNo: quotation.quotation_no,
    status: quotation.status,
    generatedOn: quotation.created_at,
    validUntil: quotation.valid_until,
    package: version?.package ?? null,
    projectType: version?.project_type ?? null,
    plotAreaSqft: version?.plot_area_sqft ?? null,
    builtupAreaSqft: version?.builtup_area_sqft ?? null,
    floors: version?.floors ?? null,
    totalCost: version?.total_cost ?? null,
    costPerSqft: version?.cost_per_sqft ?? null,
    timelineLabel: version?.timeline ?? null,
    customer: {
      name: customer.name ?? lead?.customer_name ?? "—",
      mobile: customer.mobile ?? lead?.mobile ?? "—",
      whatsapp: customer.whatsapp ?? null,
      email: customer.email ?? lead?.email ?? null,
      siteLocation: customer.site_location ?? lead?.site_location ?? "—",
      city: customer.city ?? lead?.city ?? null,
      state: customer.state ?? lead?.state ?? null,
    },
    breakdown: specBreakdown.length > 0
      ? [
          ...specBreakdown.map((b) => ({ label: b.label, percent: b.percent, amount: b.amount })),
          ...optionalItems.map((o) => ({ label: o.label, percent: o.markupPercent, amount: o.amount, optional: true })),
        ]
      : legacyBreakdown,
    timelineStages: timelineStages.map((t) => ({ name: t.name, months: t.months, startDate: t.startDate, endDate: t.endDate })),
    paymentSchedule: paymentSchedule.map((p) => ({ milestone: p.milestone, percent: p.percent, amount: p.amount })),
    inclusions,
    exclusions,
    assumptions,
    materials: (materials ?? []).map((m: any) => ({ name: m.name, spec: m.spec })),
    terms: version?.terms ?? null,
  };

  const buffer = await renderToBuffer(QuotationDocument({ data }));

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotation.quotation_no}.pdf"`,
    },
  });
}
