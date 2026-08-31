"use server";
import { createClient } from "@buildhaus/database";
import { getClientProjectId } from "@/lib/demo-scoping";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

async function assertOwnApproval(supabase: any, id: string): Promise<boolean> {
  const projectId = await getClientProjectId();
  if (!projectId) return false;
  const { data: approval } = await supabase
    .from("client_approvals").select("id,project_id").eq("id", id).maybeSingle();
  return !!approval && approval.project_id === projectId;
}

export async function approveApproval(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;
  const supabase = createClient();
  if (!(await assertOwnApproval(supabase, id))) return;

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
  if (!(await assertOwnApproval(supabase, id))) return;

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
