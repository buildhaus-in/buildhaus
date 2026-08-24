"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { getClientProjectId } from "@/lib/demo-scoping";
import { revalidatePath } from "next/cache";

export async function sendMessage(formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  const ctx = await getUserContext();
  if (!ctx?.userId || !ctx.profile) return;

  const projectId = await getClientProjectId();
  if (!projectId) return;

  const supabase = createClient();
  await supabase.from("comments").insert({
    organisation_id: ctx.profile.organisation_id,
    entity_type: "project",
    entity_id: projectId,
    body,
    client_visible: true,
    created_by: ctx.userId,
    created_at: new Date().toISOString(),
  });

  revalidatePath("/client/messages");
}
