"use server";
import { createClient } from "@buildhaus/database";
import { getClientProjectId } from "@/lib/demo-scoping";
import { revalidatePath } from "next/cache";

export async function raiseChangeRequest(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  if (!title) return;

  const projectId = await getClientProjectId();
  if (!projectId) return;

  const supabase = createClient();
  await supabase.from("change_requests").insert({
    project_id: projectId,
    title,
    description: description || null,
    status: "pending_pricing",
    cost_impact: null,
    timeline_impact_days: null,
    created_at: new Date().toISOString(),
  });

  revalidatePath("/client/change-requests");
}
