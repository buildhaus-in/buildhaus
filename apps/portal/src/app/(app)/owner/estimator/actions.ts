"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

// These rates are the ONLY source the public cost estimator reads from —
// never hardcode them in frontend code. Every change is logged to
// estimator_rate_history so past estimates stay reproducible.
export async function updateRate(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const newPercent = Number(formData.get("percent") || 0);
  if (!id) return;

  const { data: rate } = await supabase.from("estimator_rates").select("id,component,percent").eq("id", id).maybeSingle();
  if (!rate) return;
  if (Number(rate.percent) === newPercent) return;

  await supabase.from("estimator_rates").update({ percent: newPercent }).eq("id", id);
  await supabase.from("estimator_rate_history").insert({
    rate_id: id,
    key: rate.component,
    old_value: rate.percent,
    new_value: newPercent,
    changed_by: ctx.userId,
    changed_at: new Date().toISOString(),
  });

  revalidatePath("/owner/estimator");
}

export async function updatePackageRate(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const ratePerSqft = Number(formData.get("rate_per_sqft") || 0);
  if (!id || !ratePerSqft) return;

  await supabase.from("estimator_packages").update({ rate_per_sqft: ratePerSqft }).eq("id", id);
  revalidatePath("/owner/estimator");
}
