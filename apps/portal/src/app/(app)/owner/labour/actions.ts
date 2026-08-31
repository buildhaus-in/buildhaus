"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

export async function createContractor(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  throwIfError(
    await supabase.from("labour_contractors").insert({
      organisation_id: ctx.profile!.organisation_id,
      name,
      mobile: String(formData.get("mobile") || "").trim() || null,
    }),
    "Couldn't create the contractor."
  );
  revalidatePath("/owner/labour");
}

export async function recordAttendance(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const contractorId = String(formData.get("contractor_id") || "");
  const presentCount = Number(formData.get("present_count") || 0);
  if (!projectId || !contractorId || !presentCount) return;

  throwIfError(
    await supabase.from("labour_attendance").insert({
      project_id: projectId,
      contractor_id: contractorId,
      attendance_date: new Date().toISOString().slice(0, 10),
      present_count: presentCount,
      trade: String(formData.get("trade") || "Mixed"),
    }),
    "Couldn't record attendance."
  );
  revalidatePath("/owner/labour");
  revalidatePath("/owner");
}
