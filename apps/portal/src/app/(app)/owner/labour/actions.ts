"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

export async function createContractor(
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
  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Enter a contractor name." };

  const result = unwrap(
    await supabase.from("labour_contractors").insert({
      organisation_id: ctx.profile!.organisation_id,
      name,
      mobile: String(formData.get("mobile") || "").trim() || null,
    }),
    "Couldn't create the contractor."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/labour");
  return { ok: true, data: null };
}

export async function recordAttendance(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  try {
    await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const contractorId = String(formData.get("contractor_id") || "");
  const presentCount = Number(formData.get("present_count") || 0);
  if (!projectId || !contractorId || !presentCount) {
    return { ok: false, error: "Select a project, contractor and present count." };
  }

  const result = unwrap(
    await supabase.from("labour_attendance").insert({
      project_id: projectId,
      contractor_id: contractorId,
      attendance_date: new Date().toISOString().slice(0, 10),
      present_count: presentCount,
      trade: String(formData.get("trade") || "Mixed"),
    }),
    "Couldn't record attendance."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/labour");
  revalidatePath("/owner");
  return { ok: true, data: null };
}
