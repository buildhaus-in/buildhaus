"use server";
import { createClient } from "@buildhaus/database";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { revalidatePath } from "next/cache";

function revalidateTask(taskId: string) {
  revalidatePath(`/engineer/tasks/${taskId}`);
  revalidatePath("/engineer/tasks");
  revalidatePath("/engineer");
}

// Every mutation below previously had NO auth check at all — not even "is
// anyone signed in" (addTaskComment was the sole exception, and even that
// only checked ctx?.userId, never role or project membership). Any request
// that reached these actions, from any role or none, could update any
// task's status/progress/checklist for any project. This resolves the
// task's project_id and asserts the caller is Owner or an assigned member
// of that project — mirrors the real is_project_member() RLS predicate at
// the app layer, since Demo Mode has none (apps/portal/src/lib/demo-scoping.ts).
async function requireTaskAccess(supabase: any, taskId: string) {
  const ctx = await assertRole("site_engineer");
  const { data: task } = await supabase.from("tasks").select("project_id").eq("id", taskId).maybeSingle();
  if (!task) throw new Error("Task not found");
  await assertProjectAccess(supabase, task.project_id, ctx);
  return ctx;
}

// "Accept" is an assignment confirmation, not a status change — it just
// timestamps that the engineer has seen and acknowledged the task. Use
// "Start" to actually move it into progress.
export async function acceptTask(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  try {
    await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  await supabase.from("tasks").update({ accepted_at: new Date().toISOString() }).eq("id", taskId);
  revalidateTask(taskId);
}

export async function startTask(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  try {
    await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  await supabase.from("tasks").update({ status: "in_progress" }).eq("id", taskId).eq("status", "assigned");
  revalidateTask(taskId);
}

export async function updateTaskProgress(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  try {
    await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  const progress = Math.max(0, Math.min(100, Number(formData.get("progress") || 0)));
  const { data: task } = await supabase.from("tasks").select("status").eq("id", taskId).maybeSingle();
  const patch: Record<string, any> = { progress };
  if (task?.status === "assigned") patch.status = "in_progress";
  await supabase.from("tasks").update(patch).eq("id", taskId);
  revalidateTask(taskId);
}

export async function markTaskBlocked(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  try {
    await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  const reason = String(formData.get("blocker_reason") || "").trim();
  if (!reason) return;
  await supabase.from("tasks").update({ status: "blocked", blocker_reason: reason }).eq("id", taskId);
  revalidateTask(taskId);
}

export async function resumeTask(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  try {
    await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  await supabase.from("tasks").update({ status: "in_progress", blocker_reason: null }).eq("id", taskId).eq("status", "blocked");
  revalidateTask(taskId);
}

export async function submitTaskForReview(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  try {
    await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  await supabase.from("tasks").update({ status: "submitted" }).eq("id", taskId).eq("status", "in_progress");
  revalidateTask(taskId);
}

export async function toggleChecklistItem(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  try {
    await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  const index = Number(formData.get("index"));
  const { data: task } = await supabase.from("tasks").select("checklist").eq("id", taskId).maybeSingle();
  const checklist = Array.isArray(task?.checklist) ? [...task.checklist] : [];
  if (checklist[index]) {
    checklist[index] = { ...checklist[index], done: !checklist[index].done };
    await supabase.from("tasks").update({ checklist }).eq("id", taskId);
  }
  revalidateTask(taskId);
}

export async function addTaskComment(formData: FormData) {
  const supabase = createClient();
  const taskId = String(formData.get("task_id"));
  let ctx;
  try {
    ctx = await requireTaskAccess(supabase, taskId);
  } catch {
    return;
  }
  const body = String(formData.get("body") || "").trim();
  if (!body) return;
  await supabase.from("task_comments").insert({
    task_id: taskId,
    author_id: ctx.userId,
    body,
    created_at: new Date().toISOString(),
  });
  revalidateTask(taskId);
}
