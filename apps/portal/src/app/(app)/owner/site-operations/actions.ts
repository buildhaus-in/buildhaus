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
  revalidatePath("/owner/site-operations");
  revalidatePath("/owner");
}

export async function approveReport(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;
  const publishToClient = formData.get("client_visible") === "on";

  await supabase.from("daily_reports").update({
    status: "approved",
    approved_at: new Date().toISOString(),
    returned_reason: null,
    client_visible: publishToClient,
  }).eq("id", id);

  revalidateAll();
}

export async function returnReport(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!id || !reason) return;

  await supabase.from("daily_reports").update({
    status: "returned",
    returned_reason: reason,
    approved_at: null,
  }).eq("id", id);

  revalidateAll();
}
