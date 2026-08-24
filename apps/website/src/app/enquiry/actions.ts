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
  await supabase.from("leads").insert({
    organisation_id: IDS.org,
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

  return { ok: true };
}
