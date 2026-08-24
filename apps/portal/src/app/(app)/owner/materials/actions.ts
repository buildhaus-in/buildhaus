"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

function revalidateAll() {
  revalidatePath("/owner/materials");
  revalidatePath("/owner");
}

export async function approveMaterialRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("material_requests").update({ status: "approved" }).eq("id", id);
  revalidateAll();
}

export async function fulfillMaterialRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("material_requests").update({ status: "fulfilled" }).eq("id", id);
  revalidateAll();
}

export async function rejectMaterialRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("owner_notes") || "").trim();
  if (!id) return;
  await supabase.from("material_requests").update({ status: "rejected", owner_notes: reason || null }).eq("id", id);
  revalidateAll();
}
