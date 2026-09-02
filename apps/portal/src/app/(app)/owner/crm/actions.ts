"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError, unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateLead(id: string) {
  revalidatePath("/owner/crm");
  revalidatePath(`/owner/crm/${id}`);
  revalidatePath("/owner");
}

export async function createLead(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const customerName = String(formData.get("customer_name") || "").trim();
  if (!customerName) return { ok: false, error: "Enter a customer name." };

  // leads.lead_no is not-null + unique(organisation_id, lead_no) — every
  // insert into this table needs one generated, the same way
  // owner/projects/actions.ts's createProject calls next_code() for
  // projects.code. Previously missing entirely here (and at every other
  // leads-insert call site: apps/website's enquiry/cost-estimator/
  // request-callback/request-site-visit), which Demo Mode's schema-less
  // writes never surfaced — a real Postgres project would reject every one
  // of these with "null value in column lead_no violates not-null
  // constraint".
  const { data: leadNo, error: leadNoError } = await supabase.rpc("next_code", {
    p_org: ctx.profile!.organisation_id, p_scope: "lead", p_prefix: "BH-L",
  });
  if (leadNoError) return { ok: false, error: leadNoError.message || "Couldn't generate a lead number." };

  const result = unwrap(
    await supabase.from("leads").insert({
      organisation_id: ctx.profile!.organisation_id,
      lead_no: leadNo,
      customer_name: customerName,
      mobile: String(formData.get("mobile") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      site_location: String(formData.get("site_location") || "").trim() || null,
      building_type: String(formData.get("building_type") || "residential"),
      plot_size: String(formData.get("plot_size") || "").trim() || null,
      builtup_area_sqft: Number(formData.get("builtup_area_sqft") || 0) || null,
      floors: Number(formData.get("floors") || 0) || null,
      estimated_value: Number(formData.get("estimated_value") || 0) || null,
      enquiry_date: new Date().toISOString().slice(0, 10),
      follow_up_date: String(formData.get("follow_up_date") || "") || null,
      stage: "new_enquiry",
      notes: String(formData.get("notes") || ""),
      source: "manual",
    }),
    "Couldn't create the lead."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/crm");
  return { ok: true, data: null };
}

export async function addNote(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  const note = String(formData.get("note") || "").trim();
  if (!leadId || !note) return { ok: false, error: "Enter a note." };

  const result = unwrap(
    await supabase.from("lead_activities").insert({ lead_id: leadId, type: "note", note }),
    "Couldn't add the note."
  );
  if (!result.ok) return result;

  revalidateLead(leadId);
  return { ok: true, data: null };
}

export async function markContacted(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  if (!leadId) return;

  throwIfError(
    await supabase.from("leads").update({ stage: "contacted" }).eq("id", leadId),
    "Couldn't mark the lead as contacted."
  );
  throwIfError(
    await supabase.from("lead_activities").insert({ lead_id: leadId, type: "note", note: "Marked as contacted." }),
    "Couldn't add the note."
  );
  revalidateLead(leadId);
}

export async function scheduleSiteVisit(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  const scheduledDate = String(formData.get("scheduled_date") || "");
  const notes = String(formData.get("notes") || "");
  if (!leadId || !scheduledDate) return { ok: false, error: "Choose a visit date." };

  let result = unwrap(
    await supabase.from("site_visits").insert({ lead_id: leadId, scheduled_date: scheduledDate, status: "scheduled", notes }),
    "Couldn't schedule the site visit."
  );
  if (!result.ok) return result;

  result = unwrap(
    await supabase.from("leads").update({ stage: "site_visit_scheduled", follow_up_date: scheduledDate }).eq("id", leadId),
    "Couldn't update the lead."
  );
  if (!result.ok) return result;

  result = unwrap(
    await supabase.from("lead_activities").insert({
      lead_id: leadId, type: "site_visit", note: `Site visit scheduled for ${scheduledDate}.${notes ? " " + notes : ""}`,
    }),
    "Couldn't add the note."
  );
  if (!result.ok) return result;

  revalidateLead(leadId);
  return { ok: true, data: null };
}

export async function markLost(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!leadId) return;

  throwIfError(
    await supabase.from("leads").update({ stage: "lost" }).eq("id", leadId),
    "Couldn't mark the lead as lost."
  );
  throwIfError(
    await supabase.from("lead_activities").insert({
      lead_id: leadId, type: "note", note: `Marked lost.${reason ? " Reason: " + reason : ""}`,
    }),
    "Couldn't add the note."
  );
  revalidateLead(leadId);
}

export async function convertToProject(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  if (!leadId) return;

  const { data, error } = await supabase.rpc("convert_lead_to_project", { p_lead_id: leadId });
  if (error) throw new Error(error.message || "Couldn't convert the lead to a project.");
  if (!data?.project_id) throw new Error("Couldn't convert the lead to a project.");

  revalidatePath("/owner/crm");
  revalidatePath("/owner/projects");
  revalidatePath("/owner");
  redirect(`/owner/projects/${data.project_id}`);
}
