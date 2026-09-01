"use server";
import { createClient } from "@buildhaus/database";
import { getClientProjectId } from "@/lib/demo-scoping";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

// Returns the approval's own status alongside the ownership check — callers
// need it to enforce that a decision can only be recorded once, server-side
// (see the rationale in owner/clients/actions.ts, above
// RESENDABLE_APPROVAL_STATUSES: the "Approve"/"Reject" buttons only render
// while status is sent_to_client, but that's a UI convenience, not a
// guarantee a second submit — a double-click, a stale tab reopened after
// the Owner already resent it — can't still reach this action).
async function loadOwnApproval(supabase: any, id: string): Promise<{ status: string } | null> {
  const projectId = await getClientProjectId();
  if (!projectId) return null;
  const { data: approval } = await supabase
    .from("client_approvals").select("id,project_id,status").eq("id", id).maybeSingle();
  if (!approval || approval.project_id !== projectId) return null;
  return { status: approval.status };
}

export async function approveApproval(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  const approval = await loadOwnApproval(supabase, id);
  if (!approval) return;
  if (approval.status !== "sent_to_client") {
    throw new Error(`This approval is already "${approval.status.replace(/_/g, " ")}" — it can't be approved again.`);
  }

  throwIfError(
    await supabase
      .from("client_approvals")
      .update({ status: "approved", decided_at: new Date().toISOString(), client_response: null })
      .eq("id", id),
    "Couldn't record your approval."
  );

  revalidatePath("/client/approvals");
  revalidatePath("/client");
}

export async function rejectApproval(formData: FormData) {
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id) return;
  const supabase = createClient();
  const approval = await loadOwnApproval(supabase, id);
  if (!approval) return;
  if (approval.status !== "sent_to_client") {
    throw new Error(`This approval is already "${approval.status.replace(/_/g, " ")}" — it can't be rejected again.`);
  }

  throwIfError(
    await supabase
      .from("client_approvals")
      .update({ status: "rejected", decided_at: new Date().toISOString(), client_response: reason || "No reason given." })
      .eq("id", id),
    "Couldn't record your rejection."
  );

  revalidatePath("/client/approvals");
  revalidatePath("/client");
}
