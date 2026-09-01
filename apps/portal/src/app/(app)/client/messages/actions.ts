"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { getClientProjectId } from "@/lib/demo-scoping";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

export async function sendMessage(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const body = String(formData.get("body") || "").trim();
  if (!body) return { ok: false, error: "Type a message first." };

  const ctx = await getUserContext();
  if (!ctx?.userId || !ctx.profile) return { ok: false, error: "You must be signed in." };

  const projectId = await getClientProjectId();
  if (!projectId) return { ok: false, error: "No project linked to your account yet." };

  const supabase = createClient();
  const result = unwrap(
    await supabase.from("comments").insert({
      organisation_id: ctx.profile.organisation_id,
      entity_type: "project",
      entity_id: projectId,
      body,
      client_visible: true,
      created_by: ctx.userId,
      created_at: new Date().toISOString(),
    }),
    "Couldn't send your message."
  );
  if (!result.ok) return result;

  revalidatePath("/client/messages");
  return { ok: true, data: null };
}
