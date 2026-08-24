"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function logAttendance(formData: FormData) {
  const supabase = createClient();
  const ctx = await getUserContext();
  if (!ctx?.userId) return;

  const projectId = String(formData.get("project_id") || "");
  const trade = String(formData.get("trade") || "").trim();
  const presentCount = Number(formData.get("present_count") || 0);
  const attendanceDate = String(formData.get("attendance_date") || "") || new Date().toISOString().slice(0, 10);
  if (!projectId || !trade || presentCount <= 0) return;

  const { data: contractor } = await supabase.from("labour_contractors").select("id").limit(1).maybeSingle();

  await supabase.from("labour_attendance").insert({
    project_id: projectId,
    contractor_id: contractor?.id ?? null,
    attendance_date: attendanceDate,
    trade,
    present_count: presentCount,
    logged_by: ctx.userId,
  });

  revalidatePath("/engineer/attendance");
}
