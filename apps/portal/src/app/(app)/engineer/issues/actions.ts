"use server";
import { createClient } from "@buildhaus/database";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { revalidatePath } from "next/cache";

// Previously only checked "is anyone signed in" — never role or project
// membership. See engineer/attendance/actions.ts for the full rationale.
export async function createSiteIssue(formData: FormData) {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    return;
  }

  const projectId = String(formData.get("project_id") || "");
  const title = String(formData.get("title") || "").trim();
  if (!projectId || !title) return;
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return;
  }

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
