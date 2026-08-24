"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

export async function createSupplier(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await supabase.from("suppliers").insert({
    organisation_id: ctx.profile!.organisation_id,
    name,
    category: String(formData.get("category") || "").trim() || null,
    contact_person: String(formData.get("contact_person") || "").trim() || null,
    mobile: String(formData.get("mobile") || "").trim() || null,
  });
  revalidatePath("/owner/suppliers");
}

// A simple, single-line "raise a purchase" MVP — not the full multi-item
// purchase-order workflow in the real schema, just enough to record intent
// against a supplier for a project.
export async function raisePurchase(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const supplierId = String(formData.get("supplier_id") || "");
  const projectId = String(formData.get("project_id") || "") || null;
  const materialName = String(formData.get("material_name") || "").trim();
  if (!supplierId || !materialName) return;

  await supabase.from("purchases").insert({
    supplier_id: supplierId,
    project_id: projectId,
    material_name: materialName,
    quantity: Number(formData.get("quantity") || 0) || null,
    unit: String(formData.get("unit") || "").trim() || null,
    status: "ordered",
    notes: String(formData.get("notes") || "").trim() || null,
    ordered_at: new Date().toISOString(),
  });
  revalidatePath("/owner/suppliers");
}
