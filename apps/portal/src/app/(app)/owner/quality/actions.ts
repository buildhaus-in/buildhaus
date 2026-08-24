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
  revalidatePath("/owner/quality");
  revalidatePath("/owner");
}

export async function createInspection(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const notes = String(formData.get("notes") || "").trim();
  if (!projectId) return;

  await supabase.from("inspections").insert({
    project_id: projectId,
    checklist_id: String(formData.get("checklist_id") || "") || null,
    status: "pending",
    inspected_by: ctx.userId,
    inspected_at: new Date().toISOString(),
    notes,
  });
  revalidateAll();
}

export async function passInspection(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("inspections").update({ status: "passed" }).eq("id", id);
  revalidateAll();
}

export async function failInspection(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const notes = String(formData.get("notes") || "").trim();
  if (!id) return;
  await supabase.from("inspections").update({
    status: "failed",
    notes: notes || undefined,
  }).eq("id", id);
  revalidateAll();
}

export async function closeInspection(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await supabase.from("inspections").update({ status: "closed" }).eq("id", id);
  revalidateAll();
}
