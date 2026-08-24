"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

function revalidateLead(id: string) {
  revalidatePath("/owner/crm");
  revalidatePath(`/owner/crm/${id}`);
  revalidatePath("/owner");
}

export async function createLead(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const customerName = String(formData.get("customer_name") || "").trim();
  if (!customerName) return;

  await supabase.from("leads").insert({
    organisation_id: ctx.profile!.organisation_id,
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
  });

  revalidatePath("/owner/crm");
}

export async function addNote(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  const note = String(formData.get("note") || "").trim();
  if (!leadId || !note) return;

  await supabase.from("lead_activities").insert({ lead_id: leadId, type: "note", note });
  revalidateLead(leadId);
}

export async function markContacted(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  if (!leadId) return;

  await supabase.from("leads").update({ stage: "contacted" }).eq("id", leadId);
  await supabase.from("lead_activities").insert({ lead_id: leadId, type: "note", note: "Marked as contacted." });
  revalidateLead(leadId);
}

export async function scheduleSiteVisit(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  const scheduledDate = String(formData.get("scheduled_date") || "");
  const notes = String(formData.get("notes") || "");
  if (!leadId || !scheduledDate) return;

  await supabase.from("site_visits").insert({ lead_id: leadId, scheduled_date: scheduledDate, status: "scheduled", notes });
  await supabase.from("leads").update({ stage: "site_visit_scheduled", follow_up_date: scheduledDate }).eq("id", leadId);
  await supabase.from("lead_activities").insert({
    lead_id: leadId, type: "site_visit", note: `Site visit scheduled for ${scheduledDate}.${notes ? " " + notes : ""}`,
  });
  revalidateLead(leadId);
}

export async function markLost(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!leadId) return;

  await supabase.from("leads").update({ stage: "lost" }).eq("id", leadId);
  await supabase.from("lead_activities").insert({
    lead_id: leadId, type: "note", note: `Marked lost.${reason ? " Reason: " + reason : ""}`,
  });
  revalidateLead(leadId);
}

export async function convertToProject(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const leadId = String(formData.get("lead_id") || "");
  if (!leadId) return;

  const { data, error } = await supabase.rpc("convert_lead_to_project", { p_lead_id: leadId });
  if (error || !data?.project_id) return;

  revalidatePath("/owner/crm");
  revalidatePath("/owner/projects");
  revalidatePath("/owner");
  redirect(`/owner/projects/${data.project_id}`);
}
