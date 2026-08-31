"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/owner/materials");
  revalidatePath("/owner");
}

export async function approveMaterialRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  throwIfError(
    await supabase.from("material_requests").update({ status: "approved" }).eq("id", id),
    "Couldn't approve the material request."
  );
  revalidateAll();
}

export async function fulfillMaterialRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  throwIfError(
    await supabase.from("material_requests").update({ status: "fulfilled" }).eq("id", id),
    "Couldn't mark the material request as fulfilled."
  );
  revalidateAll();
}

export async function rejectMaterialRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("owner_notes") || "").trim();
  if (!id) return;
  throwIfError(
    await supabase.from("material_requests").update({ status: "rejected", owner_notes: reason || null }).eq("id", id),
    "Couldn't reject the material request."
  );
  revalidateAll();
}
