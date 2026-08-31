"use server";
import { createClient } from "@buildhaus/database";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { revalidatePath } from "next/cache";

const ITEM_SLOTS = 6;

// Previously only checked "is anyone signed in" — never role or project
// membership. See engineer/attendance/actions.ts for the full rationale.
export async function createMaterialRequest(formData: FormData) {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    return;
  }

  const projectId = String(formData.get("project_id") || "");
  if (!projectId) return;
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return;
  }

  const { data: request } = await supabase
    .from("material_requests")
    .insert({
      project_id: projectId,
      requested_by: ctx.userId,
      status: "requested",
      priority: String(formData.get("priority") || "medium"),
      needed_by: String(formData.get("needed_by") || "") || null,
      notes: String(formData.get("notes") || ""),
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (!request) return;

  for (let i = 0; i < ITEM_SLOTS; i++) {
    const materialName = String(formData.get(`item_name_${i}`) || "").trim();
    const quantity = Number(formData.get(`item_qty_${i}`) || 0);
    const unit = String(formData.get(`item_unit_${i}`) || "").trim();
    if (materialName && quantity > 0) {
      await supabase.from("material_request_items").insert({
        material_request_id: request.id,
        material_name: materialName,
        quantity,
        unit,
      });
    }
  }

  revalidatePath("/engineer/materials");
}
