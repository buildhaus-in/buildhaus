"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function createSiteIssue(formData: FormData) {
  const supabase = createClient();
  const ctx = await getUserContext();
  if (!ctx?.userId) return;

  const projectId = String(formData.get("project_id") || "");
  const title = String(formData.get("title") || "").trim();
  if (!projectId || !title) return;

  await supabase.from("site_issues").insert({
    project_id: projectId,
    reported_by: ctx.userId,
    category: String(formData.get("category") || "other"),
    severity: String(formData.get("severity") || "medium"),
    title,
    description: String(formData.get("description") || ""),
    status: "open",
    resolution_notes: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
  });

  revalidatePath("/engineer/issues");
}
