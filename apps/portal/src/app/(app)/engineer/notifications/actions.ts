"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx) return;
  const supabase = createClient();
  const id = String(formData.get("notification_id") || "");
  if (!id) return;
  // A profile may only mark its own notifications read — previously
  // unscoped, so any signed-in engineer could mark any notification (any
  // recipient, any org) as read just by knowing its id.
  throwIfError(
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("profile_id", ctx.userId),
    "Couldn't mark the notification as read."
  );
  revalidatePath("/engineer/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  const ctx = await getUserContext();
  if (!ctx?.userId) return;
  throwIfError(
    await supabase.from("notifications").update({ read: true }).eq("profile_id", ctx.userId).eq("read", false),
    "Couldn't mark notifications as read."
  );
  revalidatePath("/engineer/notifications");
}
