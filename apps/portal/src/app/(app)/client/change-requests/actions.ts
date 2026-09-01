"use server";
import { createClient } from "@buildhaus/database";
import { getClientProjectId } from "@/lib/demo-scoping";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

export async function raiseChangeRequest(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) return { ok: false, error: "Enter a title." };

  const projectId = await getClientProjectId();
  if (!projectId) return { ok: false, error: "No project linked to your account yet." };

  const supabase = createClient();
  const result = unwrap(
    await supabase.from("change_requests").insert({
      project_id: projectId,
      title,
      description: description || null,
      status: "pending_pricing",
      cost_impact: null,
      timeline_impact_days: null,
      created_at: new Date().toISOString(),
    }),
    "Couldn't submit the change request."
  );
  if (!result.ok) return result;

  revalidatePath("/client/change-requests");
  return { ok: true, data: null };
}
