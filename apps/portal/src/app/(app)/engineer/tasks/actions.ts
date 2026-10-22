"use server";
import { createClient } from "@buildhaus/database";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
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

type Result = ActionResult<null>;

// Shared shape for every task mutation: resolve access, run the update, and
// turn every failure into a specific message for <ActionForm> — previously
// a failed auth check, an empty reason/comment, or a task whose status had
// already moved on all returned silently, so the button looked like it did
// nothing. Status-guarded updates select the rows they touched so "0 rows"
// is reported instead of passing as success.
async function taskMutation(
  formData: FormData,
  run: (supabase: any, taskId: string, ctx: Awaited<ReturnType<typeof requireTaskAccess>>) => Promise<Result>
): Promise<Result> {
  const supabase = createClient();
  const taskId = String(formData.get("task_id") || "");
  if (!taskId) return { ok: false, error: "Missing task — reload the page." };
  let ctx;
  try {
    ctx = await requireTaskAccess(supabase, taskId);
  } catch (e: any) {
    return { ok: false, error: e?.message === "Task not found" ? "This task no longer exists." : "You're not assigned to this task's project." };
  }
  const result = await run(supabase, taskId, ctx);
  if (result.ok) revalidateTask(taskId);
  return result;
}

async function guardedUpdate(supabase: any, taskId: string, patch: Record<string, any>, fromStatus: string | null, failMsg: string): Promise<Result> {
  let q = supabase.from("tasks").update(patch).eq("id", taskId);
  if (fromStatus) q = q.eq("status", fromStatus);
  const { data, error } = await q.select("id");
  if (error) return { ok: false, error: error.message || failMsg };
  if (!data || data.length === 0) return { ok: false, error: "This task's status has changed — reload the page." };
  return { ok: true, data: null };
}

// "Accept" is an assignment confirmation, not a status change — it just
// timestamps that the engineer has seen and acknowledged the task. Use
// "Start" to actually move it into progress.
export async function acceptTask(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, (supabase, taskId) =>
    guardedUpdate(supabase, taskId, { accepted_at: new Date().toISOString() }, null, "Couldn't accept the task."));
}

export async function startTask(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, (supabase, taskId) =>
    guardedUpdate(supabase, taskId, { status: "in_progress" }, "assigned", "Couldn't start the task."));
}

export async function updateTaskProgress(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, async (supabase, taskId) => {
    const raw = String(formData.get("progress") ?? "").trim();
    const progress = Number(raw);
    if (raw === "" || !Number.isFinite(progress) || progress < 0 || progress > 100) {
      return { ok: false, error: "Enter a progress between 0 and 100." };
    }
    const { data: task } = await supabase.from("tasks").select("status").eq("id", taskId).maybeSingle();
    const patch: Record<string, any> = { progress: Math.round(progress) };
    if (task?.status === "assigned") patch.status = "in_progress";
    return guardedUpdate(supabase, taskId, patch, null, "Couldn't update task progress.");
  });
}

export async function markTaskBlocked(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, async (supabase, taskId) => {
    const reason = String(formData.get("blocker_reason") || "").trim();
    if (!reason) return { ok: false, error: "Say what's blocking this task." };
    const { data: task } = await supabase.from("tasks").select("status").eq("id", taskId).maybeSingle();
    if (!task || !["assigned", "in_progress"].includes(task.status)) {
      return { ok: false, error: "This task's status has changed — reload the page." };
    }
    return guardedUpdate(supabase, taskId, { status: "blocked", blocker_reason: reason }, task.status, "Couldn't mark the task as blocked.");
  });
}

export async function resumeTask(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, (supabase, taskId) =>
    guardedUpdate(supabase, taskId, { status: "in_progress", blocker_reason: null }, "blocked", "Couldn't resume the task."));
}

export async function submitTaskForReview(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, (supabase, taskId) =>
    guardedUpdate(supabase, taskId, { status: "submitted" }, "in_progress", "Couldn't submit the task for review."));
}

export async function toggleChecklistItem(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, async (supabase, taskId) => {
    const index = Number(formData.get("index"));
    const { data: task } = await supabase.from("tasks").select("checklist").eq("id", taskId).maybeSingle();
    const checklist = Array.isArray(task?.checklist) ? [...task.checklist] : [];
    if (!Number.isInteger(index) || !checklist[index]) return { ok: false, error: "Checklist changed — reload the page." };
    checklist[index] = { ...checklist[index], done: !checklist[index].done };
    return guardedUpdate(supabase, taskId, { checklist }, null, "Couldn't update the checklist.");
  });
}

export async function addTaskComment(_prev: Result | null, formData: FormData): Promise<Result> {
  return taskMutation(formData, async (supabase, taskId, ctx) => {
    const body = String(formData.get("body") || "").trim();
    if (!body) return { ok: false, error: "Write a comment first." };
    const res = unwrap(
      await supabase.from("task_comments").insert({
        task_id: taskId,
        author_id: ctx.userId,
        body,
        created_at: new Date().toISOString(),
      }),
      "Couldn't add the comment."
    );
    return res.ok ? { ok: true, data: null } : res;
  });
}
