"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

export async function createContractor(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await supabase.from("labour_contractors").insert({
    organisation_id: ctx.profile!.organisation_id,
    name,
    mobile: String(formData.get("mobile") || "").trim() || null,
  });
  revalidatePath("/owner/labour");
}

export async function recordAttendance(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const contractorId = String(formData.get("contractor_id") || "");
  const presentCount = Number(formData.get("present_count") || 0);
  if (!projectId || !contractorId || !presentCount) return;

  await supabase.from("labour_attendance").insert({
    project_id: projectId,
    contractor_id: contractorId,
    attendance_date: new Date().toISOString().slice(0, 10),
    present_count: presentCount,
    trade: String(formData.get("trade") || "Mixed"),
  });
  revalidatePath("/owner/labour");
  revalidatePath("/owner");
}
