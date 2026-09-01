"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

export async function createSupplier(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Enter a business name." };

  const result = unwrap(
    await supabase.from("suppliers").insert({
      organisation_id: ctx.profile!.organisation_id,
      name,
      category: String(formData.get("category") || "").trim() || null,
      contact_person: String(formData.get("contact_person") || "").trim() || null,
      mobile: String(formData.get("mobile") || "").trim() || null,
    }),
    "Couldn't create the supplier."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/suppliers");
  return { ok: true, data: null };
}

// A simple, single-line "raise a purchase" MVP — not the full multi-item
// purchase-order workflow in the real schema, just enough to record intent
// against a supplier for a project.
export async function raisePurchase(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const supplierId = String(formData.get("supplier_id") || "");
  const projectId = String(formData.get("project_id") || "") || null;
  const materialName = String(formData.get("material_name") || "").trim();
  if (!supplierId || !materialName) return { ok: false, error: "Select a supplier and enter a material." };

  // purchases.organisation_id is NOT NULL on the real schema — previously
  // never set here (see supabase/migrations/0019_schema_drift_repair_2.sql).
  const result = unwrap(
    await supabase.from("purchases").insert({
      organisation_id: ctx.profile!.organisation_id,
      supplier_id: supplierId,
      project_id: projectId,
      material_name: materialName,
      quantity: Number(formData.get("quantity") || 0) || null,
      unit: String(formData.get("unit") || "").trim() || null,
      status: "ordered",
      notes: String(formData.get("notes") || "").trim() || null,
      ordered_at: new Date().toISOString(),
    }),
    "Couldn't raise the purchase."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/suppliers");
  return { ok: true, data: null };
}
