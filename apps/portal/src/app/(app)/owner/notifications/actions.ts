"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function markRead(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx) return;
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;

  // A profile may only mark its own notifications read.
  await supabase.from("notifications").update({ read: true }).eq("id", id).eq("profile_id", ctx.userId);
  revalidatePath("/owner/notifications");
  revalidatePath("/owner");
}

export async function markAllRead() {
  const ctx = await getUserContext();
  if (!ctx) return;
  const supabase = createClient();

  const { data: unread } = await supabase.from("notifications").select("id").eq("profile_id", ctx.userId).eq("read", false);
  for (const n of unread ?? []) {
    await supabase.from("notifications").update({ read: true }).eq("id", n.id);
  }
  revalidatePath("/owner/notifications");
  revalidatePath("/owner");
}
