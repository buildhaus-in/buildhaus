"use server";
import { createAdminClient } from "@buildhaus/database";
import { IDS } from "@buildhaus/database";

export type CallbackState = null | { error: string } | { ok: true };

export async function submitCallbackRequest(_prev: CallbackState, formData: FormData): Promise<CallbackState> {
  const name = String(formData.get("name") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const preferred_time = String(formData.get("preferred_time") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name) return { error: "Please enter your name." };
  if (!mobile) return { error: "Please enter a mobile number." };
  if (!preferred_time) return { error: "Please choose a preferred time to call." };

  // Service context: anonymous visitors write into owner-only CRM tables
  // (leads/lead_activities/site_visits) — same convention as the estimator.
  const supabase = createAdminClient();

  const combinedNotes = [`Preferred callback time: ${preferred_time}.`, notes].filter(Boolean).join(" ");

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
      enquiry_date: new Date().toISOString().slice(0, 10),
      follow_up_date: null,
      stage: "new_enquiry",
      notes: combinedNotes,
      source: "callback_request",
    })
    .select()
    .single();
  // Previously: this error was discarded and the function always returned
  // { ok: true } regardless, so a rejected insert looked identical to a
  // successful submission from the visitor's side.
  if (leadError || !lead) return { error: "Couldn't submit your request right now. Please try again." };

  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    type: "callback_request",
    note: `Callback requested via website — preferred time: ${preferred_time}.`,
  });

  return { ok: true };
}
