"use server";
import { createClient } from "@buildhaus/database";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

// Previously only checked "is anyone signed in" — never role or project
// membership. See engineer/attendance/actions.ts for the full rationale.
export async function createSiteIssue(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    return { ok: false, error: "You must be signed in as a Site Engineer." };
  }

  const projectId = String(formData.get("project_id") || "");
  const title = String(formData.get("title") || "").trim();
  if (!projectId || !title) return { ok: false, error: "Select a project and enter a title." };
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return { ok: false, error: "You are not assigned to this project." };
  }

  const result = unwrap(
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
    }),
    "Couldn't report the site issue."
  );
  if (!result.ok) return result;

  revalidatePath("/engineer/issues");
  return { ok: true, data: null };
}
