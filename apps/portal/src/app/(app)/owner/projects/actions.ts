"use server";
import { createClient } from "@buildhaus/database";
import { prepareUpload, receiveFile, type FileMeta, type PrepareUploadResult } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { createProjectSchema, zodErrorToFieldErrors, type ActionResult } from "@buildhaus/validation";
import { assertOwner } from "@/lib/authz";
import { unwrap, logAudit } from "@/lib/mutation";

export type DocumentFormState = { error: string } | null;

// Signed direct-to-Storage upload for a project document (Owner only) —
// see apps/portal/src/lib/uploads.ts.
export async function prepareDocumentUpload(projectId: string, meta: FileMeta): Promise<PrepareUploadResult> {
  try {
    await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner to upload a document." };
  }
  if (!projectId) return { ok: false, error: "Missing project." };
  return prepareUpload(meta, "document", `documents/${projectId}`);
}

// Owner-side document upload — project agreements, approvals, internal
// workbooks etc (the `documents` table). client_visible controls whether
// the file also surfaces on the Client portal's Documents page
// (src/app/(app)/client/documents/page.tsx), which only reads rows already
// marked client_visible=true.
export async function uploadDocument(
  projectId: string,
  _prevState: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { error: "You must be signed in as the Owner to upload a document." };
  }
  const supabase = createClient();

  const title = String(formData.get("title") || "").trim();
  if (!title) return { error: "Please enter a title." };

  const uploaded = await receiveFile(formData, "file", "document", `documents/${projectId}`);
  if ("error" in uploaded) return { error: uploaded.error };
  const url = uploaded.url;

  // Previously ignored: the insert's error was never checked, so a rejected
  // write (RLS, a NOT NULL violation, ...) looked identical to a successful
  // upload — the file was on disk, but no `documents` row ever pointed to
  // it, so it just never appeared on the page. documents.organisation_id is
  // itself NOT NULL on the real schema and was previously never set here at
  // all — exactly the class of bug that comment describes, just still
  // present until now (see supabase/migrations/0019_schema_drift_repair_2.sql).
  const { error } = await supabase.from("documents").insert({
    organisation_id: ctx.profile!.organisation_id,
    project_id: projectId,
    title,
    category: String(formData.get("category") || "") || null,
    file_url: url,
    client_visible: formData.get("client_visible") === "on",
    uploaded_at: new Date().toISOString(),
  });
  if (error) return { error: error.message || "Couldn't save the document." };

  revalidatePath(`/owner/projects/${projectId}`);
  return null;
}

export type ProjectFormState = ActionResult<{ id: string; code: string }> | null;

// Previously: no Supabase error (profile lookup, next_code RPC, or the
// final insert) was ever checked, and the action returned void — so any
// rejected write (a colliding project code hitting projects' unique
// (organisation_id, code) constraint, an RLS rejection, ...) looked
// identical to success: the form just sat there. See
// packages/database/src/demo/rpc.ts for the matching next_code fix (Demo
// Mode's mock was itself producing the collision on the very first call).
export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner to create a project." };
  }

  const emptyToUndefined = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s === "" ? undefined : s;
  };
  const parsed = createProjectSchema.safeParse({
    name: String(formData.get("name") || ""),
    project_type: String(formData.get("project_type") || ""),
    site_address: String(formData.get("site_address") || ""),
    builtup_area_sqft: emptyToUndefined(formData.get("builtup")),
    floors: emptyToUndefined(formData.get("floors")),
    contract_value: emptyToUndefined(formData.get("contract_value")),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: zodErrorToFieldErrors(parsed.error) };
  }
  const input = parsed.data;

  const supabase = createClient();
  const orgId = ctx.profile.organisation_id;

  const codeResult = await supabase.rpc("next_code", { p_org: orgId, p_scope: "project", p_prefix: "BH" });
  if (codeResult.error) {
    return { ok: false, error: `Couldn't generate a project code: ${codeResult.error.message ?? "unknown error"}` };
  }
  const code = codeResult.data as string;

  const insertResult = await supabase
    .from("projects")
    .insert({
      organisation_id: orgId,
      code,
      name: input.name,
      project_type: input.project_type,
      site_address: input.site_address,
      builtup_area_sqft: input.builtup_area_sqft ?? null,
      floors: input.floors ?? null,
      contract_value: input.contract_value ?? null,
      status: "pre_construction",
      created_by: ctx.userId,
    })
    .select("id,code")
    .single();

  const result = unwrap<{ id: string; code: string }>(insertResult, "Couldn't create the project.");
  if (!result.ok) return result;

  await logAudit(supabase, {
    action: "create",
    entityType: "project",
    entityId: result.data.id,
    summary: `Created project ${result.data.code}: ${input.name}`,
  });

  revalidatePath("/owner/projects");
  return { ok: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Tasks. The Owner creates and assigns tasks to a project's site engineer,
// and closes the loop on tasks the engineer submits for review (approve →
// completed, or return to in_progress with a reason the engineer sees as a
// comment). Previously nothing in the portal could create a task at all.
// ---------------------------------------------------------------------------
const TASK_PRIORITIES = ["low", "medium", "high"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createTask(
  projectId: string,
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner to create a task." };
  }
  const supabase = createClient();
  const text = (k: string) => String(formData.get(k) ?? "").trim();

  const title = text("title");
  const engineerId = text("site_engineer_id");
  const stageId = text("stage_id") || null;
  const priority = text("priority") || "medium";
  const startDate = text("start_date") || null;
  const dueDate = text("due_date") || null;
  if (!title) return { ok: false, error: "Enter a task title." };
  if (title.length > 200) return { ok: false, error: "Keep the title under 200 characters." };
  if (!engineerId) return { ok: false, error: "Choose the site engineer to assign." };
  if (!TASK_PRIORITIES.includes(priority)) return { ok: false, error: "Choose a valid priority." };
  if ((startDate && !ISO_DATE.test(startDate)) || (dueDate && !ISO_DATE.test(dueDate))) {
    return { ok: false, error: "Enter valid dates." };
  }
  if (startDate && dueDate && dueDate < startDate) return { ok: false, error: "The due date can't be before the start date." };

  const { data: project } = await supabase.from("projects").select("id,code").eq("id", projectId).maybeSingle();
  if (!project) return { ok: false, error: "Project not found." };
  // The engineer must be on this project — otherwise row-level security
  // hides the task from them and it would silently never appear.
  const { data: member } = await supabase
    .from("project_members").select("id")
    .eq("project_id", projectId).eq("profile_id", engineerId).eq("role_key", "site_engineer")
    .maybeSingle();
  if (!member) return { ok: false, error: "That engineer isn't assigned to this project — add them under Users first." };
  if (stageId) {
    const { data: stage } = await supabase.from("project_stages").select("id").eq("id", stageId).eq("project_id", projectId).maybeSingle();
    if (!stage) return { ok: false, error: "Choose a stage from this project." };
  }

  const checklist = text("checklist")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((label) => ({ label, done: false }));

  const insert = await supabase
    .from("tasks")
    .insert({
      project_id: projectId,
      stage_id: stageId,
      title,
      description: text("description") || null,
      notes: text("instructions") || null,
      site_engineer_id: engineerId,
      priority,
      start_date: startDate,
      due_date: dueDate,
      floor: text("floor") || null,
      zone: text("zone") || null,
      drawing_ref: text("drawing_ref") || null,
      checklist,
      status: "assigned",
      progress: 0,
      created_by: ctx.userId,
    })
    .select("id")
    .single();
  if (insert.error || !insert.data) return { ok: false, error: insert.error?.message || "Couldn't create the task." };

  await logAudit(supabase, {
    action: "create",
    entityType: "task",
    entityId: insert.data.id,
    summary: `Task "${title}" assigned on ${project.code}`,
  });
  revalidatePath(`/owner/projects/${projectId}`);
  revalidatePath("/engineer");
  revalidatePath("/engineer/tasks");
  return { ok: true, data: null };
}

export async function reviewTask(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner to review a task." };
  }
  const supabase = createClient();
  const taskId = String(formData.get("task_id") || "");
  const decision = String(formData.get("decision") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!taskId) return { ok: false, error: "Missing task — reload the page." };
  if (decision !== "approve" && decision !== "return") return { ok: false, error: "Choose approve or return." };
  if (decision === "return" && !reason) return { ok: false, error: "Say what needs fixing so the engineer knows." };

  const patch = decision === "approve"
    ? { status: "completed", progress: 100 }
    : { status: "in_progress" };
  // Only a task still awaiting review can be reviewed — guards against a
  // double click or two tabs reviewing the same task.
  const { data: updated, error } = await supabase
    .from("tasks").update(patch).eq("id", taskId).eq("status", "submitted").select("id,title,project_id");
  if (error) return { ok: false, error: error.message || "Couldn't update the task." };
  const task = updated?.[0];
  if (!task) return { ok: false, error: "This task is no longer awaiting review — reload the page." };

  if (decision === "return") {
    const res = unwrap(
      await supabase.from("task_comments").insert({
        task_id: taskId,
        author_id: ctx.userId,
        body: `Returned for rework: ${reason}`,
        created_at: new Date().toISOString(),
      }),
      "Task returned, but the reason couldn't be saved as a comment."
    );
    if (!res.ok) return res;
  }

  await logAudit(supabase, {
    action: decision === "approve" ? "approve" : "return",
    entityType: "task",
    entityId: taskId,
    summary: decision === "approve" ? `Task "${task.title}" approved` : `Task "${task.title}" returned: ${reason}`,
  });
  revalidatePath(`/owner/projects/${task.project_id}`);
  revalidatePath(`/engineer/tasks/${taskId}`);
  revalidatePath("/engineer/tasks");
  revalidatePath("/engineer");
  return { ok: true, data: null };
}
