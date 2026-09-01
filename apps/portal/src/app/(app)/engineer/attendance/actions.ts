"use server";
import { createClient } from "@buildhaus/database";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

// Previously only checked "is anyone signed in" (getUserContext(), used
// solely to grab ctx.userId) — never the caller's role or whether they're
// actually assigned to project_id. Any authenticated user of any role could
// log attendance against any project. assertRole + assertProjectAccess close
// both gaps (mirrors real is_project_member() RLS at the app layer, since
// Demo Mode has none).
export async function logAttendance(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    return { ok: false, error: "You must be signed in as a Site Engineer." };
  }

  const projectId = String(formData.get("project_id") || "");
  const trade = String(formData.get("trade") || "").trim();
  const presentCount = Number(formData.get("present_count") || 0);
  const attendanceDate = String(formData.get("attendance_date") || "") || new Date().toISOString().slice(0, 10);
  if (!projectId || !trade || presentCount <= 0) {
    return { ok: false, error: "Select a project, trade, and enter a present count." };
  }
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return { ok: false, error: "You are not assigned to this project." };
  }

  const { data: contractor } = await supabase.from("labour_contractors").select("id").limit(1).maybeSingle();

  const result = unwrap(
    await supabase.from("labour_attendance").insert({
      project_id: projectId,
      contractor_id: contractor?.id ?? null,
      attendance_date: attendanceDate,
      trade,
      present_count: presentCount,
      logged_by: ctx.userId,
    }),
    "Couldn't log attendance."
  );
  if (!result.ok) return result;

  revalidatePath("/engineer/attendance");
  return { ok: true, data: null };
}
