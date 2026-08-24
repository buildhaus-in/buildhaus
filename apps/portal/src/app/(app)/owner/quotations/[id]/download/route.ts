import { NextResponse } from "next/server";
import { createClient } from "@buildhaus/database";
import { QuotationDocument, type QuotationPdfData } from "@buildhaus/utils/pdf";
import { renderToBuffer } from "@react-pdf/renderer";
import { getUserContext } from "@/lib/session";

// Owner-side download — a real generated PDF binary (not a plain-text
// stand-in), using the same @react-pdf/renderer document as the public
// /quotation/[token]/pdf route on apps/website (shared via
// @buildhaus/utils/pdf). No email/WhatsApp re-send here by design (out of
// scope); this is the only distribution channel implemented.
//
// Route Handlers are NOT wrapped by the (app) layout's role-prefix guard (that
// guard only runs for page renders), and middleware.ts only checks "is there a
// signed-in user" — not which role. So this file must assert `owner` itself,
// the same way every owner/*/actions.ts does via assertOwner(), otherwise any
// authenticated Engineer/Architect/Client could hit this URL directly and read
// another client's quotation (mobile number, full cost breakdown). This matters
// most in Demo Mode, which has no RLS to fall back on.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) {
    return new NextResponse("Not authorised.", { status: 403 });
  }

  const supabase = createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("id,quotation_no,status,valid_until,created_at,organisation_id,lead_id,current_version,leads(customer_name,mobile,whatsapp,email,site_location,city,state),projects(code,name,site_address)")
    .eq("id", params.id)
    .maybeSingle();

  if (!quotation || (quotation as any).organisation_id !== ctx.profile?.organisation_id) {
    return new NextResponse("Quotation not found.", { status: 404 });
  }

  const { data: version } = await supabase
    .from("quotation_versions")
    .select("*")
    .eq("quotation_id", quotation.id)
    .eq("version", quotation.current_version ?? 1)
    .maybeSingle();

  const { data: materials } = await supabase
    .from("material_catalogue")
    .select("name,unit,spec")
    .limit(6);

  const lead = (quotation as any).leads;
  const project = (quotation as any).projects;
  const specs: any = version?.specifications ?? {};
  const customer = specs.customer ?? {};

  // Two quotation "shapes" exist in this dataset: estimator-generated
  // quotations carry a percent-based `specifications.breakdown`; older/manual
  // "detailed" quotations only set the flat material/labour/design/taxes
  // columns on quotation_versions. Render whichever is populated so this
  // works for both instead of showing an empty cost table for one of them.
  const specBreakdown: any[] = specs.breakdown ?? [];
  const optionalItems: any[] = version?.optional_items ?? [];
  const total = Number(version?.total_cost ?? 0);
  const pct = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);

  const breakdown: QuotationPdfData["breakdown"] = specBreakdown.length > 0
    ? [
        ...specBreakdown.map((b) => ({ label: b.label, percent: b.percent, amount: b.amount })),
        ...optionalItems.map((o) => ({ label: o.label, percent: o.markupPercent, amount: o.amount, optional: true })),
      ]
    : [
        { label: "Material cost", percent: pct(Number(version?.material_cost ?? 0)), amount: Number(version?.material_cost ?? 0) },
        { label: "Labour cost", percent: pct(Number(version?.labour_cost ?? 0)), amount: Number(version?.labour_cost ?? 0) },
        { label: "Design cost", percent: pct(Number(version?.design_cost ?? 0)), amount: Number(version?.design_cost ?? 0) },
        { label: "Taxes", percent: pct(Number(version?.taxes ?? 0)), amount: Number(version?.taxes ?? 0) },
      ].filter((line) => line.amount > 0);

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
      name: customer.name ?? lead?.customer_name ?? project?.name ?? "—",
      mobile: customer.mobile ?? lead?.mobile ?? "—",
      whatsapp: customer.whatsapp ?? lead?.whatsapp ?? null,
      email: customer.email ?? lead?.email ?? null,
      siteLocation: customer.site_location ?? lead?.site_location ?? project?.site_address ?? "—",
      city: customer.city ?? lead?.city ?? null,
      state: customer.state ?? lead?.state ?? null,
    },
    breakdown,
    timelineStages: (specs.timeline_stages ?? []).map((t: any) => ({ name: t.name, months: t.months, startDate: t.startDate, endDate: t.endDate })),
    paymentSchedule: (version?.payment_schedule ?? []).map((p: any) => ({ milestone: p.milestone, percent: p.percent, amount: p.amount })),
    inclusions: version?.inclusions ?? [],
    exclusions: version?.exclusions ?? [],
    assumptions: specs.assumptions ?? [],
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
