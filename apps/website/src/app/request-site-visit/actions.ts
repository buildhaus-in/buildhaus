"use server";
import { createAdminClient } from "@buildhaus/database";
import { IDS } from "@buildhaus/database";

export type SiteVisitState = null | { error: string } | { ok: true };

export async function submitSiteVisitRequest(_prev: SiteVisitState, formData: FormData): Promise<SiteVisitState> {
  const name = String(formData.get("name") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const site_location = String(formData.get("site_location") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const building_type = String(formData.get("building_type") || "").trim();
  const preferred_date = String(formData.get("preferred_date") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) return { error: "Please enter your name." };
  if (!mobile) return { error: "Please enter a mobile number." };
  if (!site_location) return { error: "Please tell us the site location." };
  if (!preferred_date) return { error: "Please choose a preferred date." };

  // Service context: anonymous visitors write into owner-only CRM tables
  // (leads/lead_activities/site_visits) — same convention as the estimator.
  const supabase = createAdminClient();

  // leads.lead_no is not-null + unique(organisation_id, lead_no) — was
  // missing from this insert entirely (Demo Mode's schema-less writes never
  // surfaced it). A real Postgres project rejects the insert without it.
  const { data: leadNo, error: leadNoError } = await supabase.rpc("next_code", {
    p_org: IDS.org, p_scope: "lead", p_prefix: "BH-L",
  });
  if (leadNoError) return { error: "Couldn't submit your request right now. Please try again." };

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      organisation_id: IDS.org,
      lead_no: leadNo,
      customer_name: name,
      mobile,
      email: email || null,
      site_location,
      city: city || null,
      state: state || null,
      building_type: building_type || null,
      enquiry_date: new Date().toISOString().slice(0, 10),
      follow_up_date: preferred_date,
      stage: "site_visit_scheduled",
      notes: notes || null,
      source: "site_visit_request",
    })
    .select()
    .single();
  // Previously: this error was discarded and the function always returned
  // { ok: true } regardless, so a rejected insert (missing lead_no, or
  // anything else) looked identical to a successful submission from the
  // visitor's side — CLAUDE.md's "never fail silently," just on the public
  // site instead of the portal.
  if (leadError || !lead) return { error: "Couldn't submit your request right now. Please try again." };

  await supabase.from("site_visits").insert({
    lead_id: lead.id,
    scheduled_date: preferred_date,
    status: "scheduled",
    notes: notes || null,
  });
  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    type: "site_visit",
    note: `Site visit requested via website for ${preferred_date}.`,
  });

  return { ok: true };
}
