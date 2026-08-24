"use server";
import { createAdminClient } from "@buildhaus/database";

export type RequestState = null | { ok: true; message: string } | { ok: false; message: string };

async function logActivity(leadId: string | null, note: string): Promise<RequestState> {
  if (!leadId) return { ok: false, message: "This quotation isn't linked to a lead record." };
  // Service context: lead_activities is owner-only under RLS (0010) and this
  // runs for anonymous visitors. The note text is one of the fixed templates
  // below (never visitor-supplied), so the write surface is limited to
  // attaching a canned follow-up note to a lead id.
  const supabase = createAdminClient();
  await supabase.from("lead_activities").insert({ lead_id: leadId, type: "note", note });
  return { ok: true, message: "Request received — our team will follow up shortly." };
}

export async function requestDetailedBoq(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const leadId = String(formData.get("lead_id") || "") || null;
  const quotationNo = String(formData.get("quotation_no") || "");
  return logActivity(leadId, `Customer requested a detailed BOQ from instant quotation ${quotationNo}.`);
}

export async function requestSiteVisitFromQuotation(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const leadId = String(formData.get("lead_id") || "") || null;
  const quotationNo = String(formData.get("quotation_no") || "");
  return logActivity(leadId, `Customer requested a site visit from instant quotation ${quotationNo}.`);
}

export async function requestCallback(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const leadId = String(formData.get("lead_id") || "") || null;
  const quotationNo = String(formData.get("quotation_no") || "");
  return logActivity(leadId, `Customer requested a callback from instant quotation ${quotationNo}.`);
}
