"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

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
    await supabase.from("organisations").update({ name, city: city || null, state: state || null }).eq("id", orgId);
  }

  const { data: settingsRow } = await supabase.from("organisation_settings").select("id").eq("organisation_id", orgId).maybeSingle();
  if (settingsRow) {
    await supabase.from("organisation_settings").update({ currency, timezone }).eq("id", settingsRow.id);
  } else {
    await supabase.from("organisation_settings").insert({ organisation_id: orgId, currency, timezone });
  }

  revalidatePath("/owner/settings");
}
