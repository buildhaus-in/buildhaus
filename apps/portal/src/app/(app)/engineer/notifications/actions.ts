"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(formData: FormData) {
  const supabase = createClient();
  const id = String(formData.get("notification_id") || "");
  if (!id) return;
  await supabase.from("notifications").update({ read: true }).eq("id", id);
  revalidatePath("/engineer/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  const ctx = await getUserContext();
  if (!ctx?.userId) return;
  await supabase.from("notifications").update({ read: true }).eq("profile_id", ctx.userId).eq("read", false);
  revalidatePath("/engineer/notifications");
}
