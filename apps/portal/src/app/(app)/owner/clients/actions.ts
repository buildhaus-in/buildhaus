"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

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

  throwIfError(
    await supabase.from("client_approvals").update({
      status: "sent_to_client",
      sent_at: new Date().toISOString(),
      decided_at: null,
      client_response: null,
    }).eq("id", id),
    "Couldn't resend the approval to the client."
  );

  revalidateAll();
}

export async function priceChangeRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const costImpact = Number(formData.get("cost_impact") || 0) || null;
  const timelineImpactDays = Number(formData.get("timeline_impact_days") || 0) || null;
  if (!id) return;

  throwIfError(
    await supabase.from("change_requests").update({
      status: "cost_time_shared",
      cost_impact: costImpact,
      timeline_impact_days: timelineImpactDays,
    }).eq("id", id),
    "Couldn't share cost/time impact with the client."
  );

  revalidatePath("/owner/clients");
  revalidatePath("/owner");
}

export async function rejectChangeRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;

  throwIfError(
    await supabase.from("change_requests").update({ status: "rejected" }).eq("id", id),
    "Couldn't reject the change request."
  );
  revalidatePath("/owner/clients");
  revalidatePath("/owner");
}
