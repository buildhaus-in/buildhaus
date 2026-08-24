"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

function revalidateAll() {
  revalidatePath("/owner/clients");
  revalidatePath("/owner");
  revalidatePath("/client/approvals");
}

// A rejected/changes-requested approval gets reworked off-platform, then the
// Owner resends it to the client for another look.
export async function resendApproval(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await supabase.from("client_approvals").update({
    status: "sent_to_client",
    sent_at: new Date().toISOString(),
    decided_at: null,
    client_response: null,
  }).eq("id", id);

  revalidateAll();
}

export async function priceChangeRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const costImpact = Number(formData.get("cost_impact") || 0) || null;
  const timelineImpactDays = Number(formData.get("timeline_impact_days") || 0) || null;
  if (!id) return;

  await supabase.from("change_requests").update({
    status: "cost_time_shared",
    cost_impact: costImpact,
    timeline_impact_days: timelineImpactDays,
  }).eq("id", id);

  revalidatePath("/owner/clients");
  revalidatePath("/owner");
}

export async function rejectChangeRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await supabase.from("change_requests").update({ status: "rejected" }).eq("id", id);
  revalidatePath("/owner/clients");
  revalidatePath("/owner");
}
