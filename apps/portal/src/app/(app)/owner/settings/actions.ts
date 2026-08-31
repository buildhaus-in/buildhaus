"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

export async function updateOrgSettings(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const orgId = ctx.profile!.organisation_id;

  const name = String(formData.get("name") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const state = String(formData.get("state") || "").trim();
  const currency = String(formData.get("currency") || "INR");
  const timezone = String(formData.get("timezone") || "Asia/Kolkata");

  if (name) {
    throwIfError(
      await supabase.from("organisations").update({ name, city: city || null, state: state || null }).eq("id", orgId),
      "Couldn't update organisation details."
    );
  }

  const { data: settingsRow } = await supabase.from("organisation_settings").select("id").eq("organisation_id", orgId).maybeSingle();
  if (settingsRow) {
    throwIfError(
      await supabase.from("organisation_settings").update({ currency, timezone }).eq("id", settingsRow.id),
      "Couldn't update organisation settings."
    );
  } else {
    throwIfError(
      await supabase.from("organisation_settings").insert({ organisation_id: orgId, currency, timezone }),
      "Couldn't save organisation settings."
    );
  }

  revalidatePath("/owner/settings");
}
