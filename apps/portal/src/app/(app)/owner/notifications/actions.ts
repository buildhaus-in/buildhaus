"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

export async function markRead(formData: FormData) {
  const ctx = await getUserContext();
  if (!ctx) return;
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;

  // A profile may only mark its own notifications read.
  throwIfError(
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("profile_id", ctx.userId),
    "Couldn't mark the notification as read."
  );
  revalidatePath("/owner/notifications");
  revalidatePath("/owner");
}

export async function markAllRead() {
  const ctx = await getUserContext();
  if (!ctx) return;
  const supabase = createClient();

  const { data: unread, error } = await supabase.from("notifications").select("id").eq("profile_id", ctx.userId).eq("read", false);
  if (error) throw new Error(error.message || "Couldn't load your notifications.");
  for (const n of unread ?? []) {
    throwIfError(
      await supabase.from("notifications").update({ read: true }).eq("id", n.id),
      "Couldn't mark a notification as read."
    );
  }
  revalidatePath("/owner/notifications");
  revalidatePath("/owner");
}
