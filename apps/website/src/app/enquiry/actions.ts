"use server";
import { createAdminClient } from "@buildhaus/database";
import { IDS } from "@buildhaus/database";

export type EnquiryState = null | { error: string } | { ok: true };

export async function submitEnquiry(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const name = String(formData.get("name") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const site_location = String(formData.get("site_location") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const building_type = String(formData.get("building_type") || "").trim();
  const requirement = String(formData.get("requirement") || "").trim();

  if (!name) return { error: "Please enter your name." };
  if (!mobile) return { error: "Please enter a mobile number." };
  if (!site_location) return { error: "Please tell us the site location." };

  // Service context: anonymous visitors write into owner-only CRM tables
  // (leads/lead_activities/site_visits) — same convention as the estimator.
  const supabase = createAdminClient();

  // leads.lead_no is not-null + unique(organisation_id, lead_no) — was
  // missing from this insert entirely (Demo Mode's schema-less writes never
  // surfaced it). A real Postgres project rejects the insert without it.
  const { data: leadNo, error: leadNoError } = await supabase.rpc("next_code", {
    p_org: IDS.org, p_scope: "lead", p_prefix: "BH-L",
  });
  if (leadNoError) return { error: "Couldn't submit your enquiry right now. Please try again." };

  // Previously: this insert's result was discarded entirely and the
  // function always returned { ok: true } regardless, so a rejected write
  // (missing lead_no, or anything else) looked identical to a successful
  // submission from the visitor's side — CLAUDE.md's "never fail silently."
  const { error } = await supabase.from("leads").insert({
    organisation_id: IDS.org,
    lead_no: leadNo,
    customer_name: name,
    mobile,
    email: email || null,
    site_location,
    city: city || null,
    building_type: building_type || null,
    enquiry_date: new Date().toISOString().slice(0, 10),
    follow_up_date: null,
    stage: "new_enquiry",
    notes: requirement || null,
    source: "enquiry_form",
  });
  if (error) return { error: "Couldn't submit your enquiry right now. Please try again." };

  return { ok: true };
}
