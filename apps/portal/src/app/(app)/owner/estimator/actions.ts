"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

// These rates are the ONLY source the public cost estimator reads from —
// never hardcode them in frontend code. Every change is logged to
// estimator_rate_history so past estimates stay reproducible.
export async function updateRate(
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
  const id = String(formData.get("id") || "");
  const newPercent = Number(formData.get("percent") || 0);
  if (!id) return { ok: false, error: "Missing rate id." };

  const { data: rate } = await supabase.from("estimator_rates").select("id,component,percent").eq("id", id).maybeSingle();
  if (!rate) return { ok: false, error: "Rate not found." };
  if (Number(rate.percent) === newPercent) return { ok: true, data: null };

  let result = unwrap(
    await supabase.from("estimator_rates").update({ percent: newPercent }).eq("id", id),
    "Couldn't update the rate."
  );
  if (!result.ok) return result;

  result = unwrap(
    await supabase.from("estimator_rate_history").insert({
      rate_id: id,
      key: rate.component,
      old_value: rate.percent,
      new_value: newPercent,
      changed_by: ctx.userId,
      changed_at: new Date().toISOString(),
    }),
    "Couldn't log the rate change."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/estimator");
  return { ok: true, data: null };
}

export async function updatePackageRate(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const ratePerSqft = Number(formData.get("rate_per_sqft") || 0);
  if (!id || !ratePerSqft) return { ok: false, error: "Enter a rate per sqft." };

  const result = unwrap(
    await supabase.from("estimator_packages").update({ rate_per_sqft: ratePerSqft }).eq("id", id),
    "Couldn't update the package rate."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/estimator");
  return { ok: true, data: null };
}
