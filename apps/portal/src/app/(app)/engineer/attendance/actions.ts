"use server";
import { createClient } from "@buildhaus/database";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { revalidatePath } from "next/cache";

// Previously only checked "is anyone signed in" (getUserContext(), used
// solely to grab ctx.userId) — never the caller's role or whether they're
// actually assigned to project_id. Any authenticated user of any role could
// log attendance against any project. assertRole + assertProjectAccess close
// both gaps (mirrors real is_project_member() RLS at the app layer, since
// Demo Mode has none).
export async function logAttendance(formData: FormData) {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    return;
  }

  const projectId = String(formData.get("project_id") || "");
  const trade = String(formData.get("trade") || "").trim();
  const presentCount = Number(formData.get("present_count") || 0);
  const attendanceDate = String(formData.get("attendance_date") || "") || new Date().toISOString().slice(0, 10);
  if (!projectId || !trade || presentCount <= 0) return;
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return;
  }

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
