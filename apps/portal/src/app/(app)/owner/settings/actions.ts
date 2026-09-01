"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

export async function updateOrgSettings(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const orgId = ctx.profile!.organisation_id;

  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const currency = String(formData.get("currency") || "INR");
  const timezone = String(formData.get("timezone") || "Asia/Kolkata");

  if (name) {
    const result = unwrap(
      await supabase.from("organisations").update({ name, city: city || null, state: state || null }).eq("id", orgId),
      "Couldn't update organisation details."
    );
    if (!result.ok) return result;
  }

  const { data: settingsRow } = await supabase.from("organisation_settings").select("id").eq("organisation_id", orgId).maybeSingle();
  if (settingsRow) {
    const result = unwrap(
      await supabase.from("organisation_settings").update({ currency, timezone }).eq("id", settingsRow.id),
      "Couldn't update organisation settings."
    );
    if (!result.ok) return result;
  } else {
    const result = unwrap(
      await supabase.from("organisation_settings").insert({ organisation_id: orgId, currency, timezone }),
      "Couldn't save organisation settings."
    );
    if (!result.ok) return result;
  }

  revalidatePath("/owner/settings");
  return { ok: true, data: null };
}
