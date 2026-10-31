"use server";
import { createClient, uploadFile } from "@buildhaus/database";
import { validateFile } from "@buildhaus/utils";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const LABOUR_ROWS = 5;
const MATERIAL_ROWS = 5;
const PHOTO_ROWS = 3;

function textOrNull(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}

// Duck-typed rather than `instanceof File`: which File class a Server
// Action's FormData hands back depends on the Node version and Next's own
// multipart parser, and a failed instanceof check here used to drop the
// photo without a word while the rest of the report saved.
function chosenFile(v: FormDataEntryValue | null): File | null {
  if (!v || typeof v === "string") return null;
  const f = v as unknown as File;
  return typeof f.arrayBuffer === "function" && typeof f.size === "number" && f.size > 0 ? f : null;
}

function fail(projectId: string, message: string): never {
  const q = projectId ? `project=${encodeURIComponent(projectId)}&` : "";
  redirect(`/engineer/report?${q}error=${encodeURIComponent(message)}`);
}

// Previously only checked "is anyone signed in" — never role or project
// membership, so any authenticated user could write a daily report against
// any project_id. See engineer/attendance/actions.ts for the full rationale.
async function persistReport(formData: FormData, status: "draft" | "submitted") {
  const supabase = createClient();
  let ctx;
  const projectId = String(formData.get("project_id") || "");
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    fail(projectId, "Your session has expired — please sign in again.");
  }

  const reportDate = String(formData.get("report_date") || "");
  const existingId = textOrNull(formData.get("report_id"));
  if (!projectId || !reportDate) fail(projectId, "Choose a project before saving the report.");
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    fail(projectId, "You're not assigned to this project.");
  }
  if (existingId) {
    // report_id is caller-supplied too — without this, an engineer could
    // pass their own project_id (so the check above passes) alongside
    // another project's report_id, and the update below would silently
    // reassign that other report to their project. Re-check access against
    // the report's ACTUAL project, not the one the form claims.
    const { data: existing } = await supabase
      .from("daily_reports")
      .select("project_id,engineer_id,status")
      .eq("id", existingId)
      .maybeSingle();
    if (!existing) fail(projectId, "That update no longer exists — reload the page.");
    try {
      await assertProjectAccess(supabase, existing.project_id, ctx);
    } catch {
      fail(projectId, "You're not assigned to this report's project.");
    }
    if (existing.engineer_id !== ctx.userId) fail(projectId, "You can only edit your own updates.");
    // Several updates a day are allowed now, so a submitted one is final for
    // the engineer — a stale tab must not overwrite it.
    if (existing.status === "submitted" || existing.status === "approved") {
      fail(projectId, "That update was already submitted — add a new update instead.");
    }
  }

  // Validate every photo slot BEFORE writing anything — a file picker can't
  // be trusted client-side alone, and we'd rather bounce the whole
  // submission back with a clear error than partially save the report with
  // a photo silently dropped. Each slot keeps its existing photo (via a
  // hidden `photo_existing_url_i` field) unless a new file was chosen —
  // <input type="file"> can't be pre-filled by the browser for security
  // reasons, so this is how a re-save of a draft avoids losing photos that
  // were uploaded earlier and aren't being replaced.
  const photoUploads: { index: number; file: File }[] = [];
  for (let i = 0; i < PHOTO_ROWS; i++) {
    const file = chosenFile(formData.get(`photo_file_${i}`));
    if (file) {
      const validationError = validateFile(file, "photo");
      if (validationError) fail(projectId, `Photo ${i + 1}: ${validationError}`);
      photoUploads.push({ index: i, file });
    }
  }

  // Upload before writing any rows, so a failed upload leaves the report
  // (and its existing photos) exactly as it was.
  const uploadedUrls = new Map<number, string>();
  for (const { index, file } of photoUploads) {
    try {
      const uploaded = await uploadFile({ file, filename: file.name, folder: `daily-reports/${projectId}` });
      uploadedUrls.set(index, uploaded.url);
    } catch (e) {
      console.error("daily report photo upload failed", e);
      fail(projectId, `Photo ${index + 1} couldn't be uploaded — nothing was saved. Please try again.`);
    }
  }

  const header: Record<string, any> = {
    project_id: projectId,
    engineer_id: ctx.userId,
    report_date: reportDate,
    status,
    weather: textOrNull(formData.get("weather")),
    stage: textOrNull(formData.get("stage")),
    floor: textOrNull(formData.get("floor")),
    zone: textOrNull(formData.get("zone")),
    work_completed: textOrNull(formData.get("work_completed")),
    quantity_executed: Number(formData.get("quantity_executed") || 0) || null,
    unit: textOrNull(formData.get("unit")),
    machinery_used: textOrNull(formData.get("machinery_used")),
    quality_checks: textOrNull(formData.get("quality_checks")),
    site_issues: textOrNull(formData.get("site_issues")),
    delays: textOrNull(formData.get("delays")),
    safety_observations: textOrNull(formData.get("safety_observations")),
    client_instructions: textOrNull(formData.get("client_instructions")),
    tomorrow_plan: textOrNull(formData.get("tomorrow_plan")),
    notes: textOrNull(formData.get("notes")),
  };
  if (status === "submitted") header.submitted_at = new Date().toISOString();

  let reportId = existingId || null;
  if (reportId) {
    throwIfError(
      await supabase.from("daily_reports").update(header).eq("id", reportId),
      "Couldn't save the report."
    );
  } else {
    const { data: created, error } = await supabase.from("daily_reports").insert(header).select().single();
    if (error) {
      console.error("daily report insert failed", error);
      // 23505: the database still has 0004's one-report-a-day rule —
      // migration 0026 removes it.
      fail(projectId, error.code === "23505"
        ? "Only one update per day is allowed until the database is updated (migration 0026). Edit today's draft instead."
        : `Couldn't save the update: ${error.message || "please try again."}`);
    }
    reportId = created?.id ?? null;
  }
  if (!reportId) fail(projectId, "Couldn't save the report — please try again.");

  // Replace child rows wholesale — simplest correct way to sync a small,
  // fixed-slot repeatable-row form without diffing.
  throwIfError(
    await supabase.from("daily_report_labour").delete().eq("daily_report_id", reportId),
    "Couldn't save the report's labour rows."
  );
  throwIfError(
    await supabase.from("daily_report_materials").delete().eq("daily_report_id", reportId),
    "Couldn't save the report's material rows."
  );
  throwIfError(
    await supabase.from("daily_report_photos").delete().eq("daily_report_id", reportId),
    "Couldn't save the report's photos."
  );

  for (let i = 0; i < LABOUR_ROWS; i++) {
    const category = textOrNull(formData.get(`labour_category_${i}`));
    const count = Number(formData.get(`labour_count_${i}`) || 0);
    if (category && count > 0) {
      throwIfError(
        await supabase.from("daily_report_labour").insert({ daily_report_id: reportId, category, count }),
        "Couldn't save a labour row."
      );
    }
  }
  for (let i = 0; i < MATERIAL_ROWS; i++) {
    const material = textOrNull(formData.get(`material_name_${i}`));
    const received = Number(formData.get(`material_received_${i}`) || 0) || null;
    const consumed = Number(formData.get(`material_consumed_${i}`) || 0) || null;
    const unit = textOrNull(formData.get(`material_unit_${i}`));
    if (material) {
      throwIfError(
        await supabase.from("daily_report_materials").insert({ daily_report_id: reportId, material, received, consumed, unit }),
        "Couldn't save a material row."
      );
    }
  }
  for (let i = 0; i < PHOTO_ROWS; i++) {
    const caption = textOrNull(formData.get(`photo_caption_${i}`));
    // A newly uploaded photo replaces the slot's existing one.
    const url = uploadedUrls.get(i) ?? textOrNull(formData.get(`photo_existing_url_${i}`));
    if (url) {
      throwIfError(
        await supabase.from("daily_report_photos").insert({ daily_report_id: reportId, url, caption }),
        "Couldn't save a photo."
      );
    }
  }

  revalidatePath("/engineer/report");
  revalidatePath("/engineer");
  redirect(`/engineer/report?project=${encodeURIComponent(projectId)}&done=${status}`);
}

export async function saveDraftReport(formData: FormData) {
  await persistReport(formData, "draft");
}

export async function submitReport(formData: FormData) {
  await persistReport(formData, "submitted");
}

// An engineer may delete their own update until the Owner approves it — an
// approved update is the record the Owner signed off (and may already be
// published to the client), so it stays. Child rows go with the report via
// ON DELETE CASCADE; they're also deleted explicitly first so Demo Mode,
// which has no cascades, behaves the same. The audit trigger on
// daily_reports logs the deletion.
export async function deleteReport(formData: FormData) {
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const reportId = textOrNull(formData.get("report_id"));
  let ctx;
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    fail(projectId, "Your session has expired — please sign in again.");
  }
  if (!reportId) fail(projectId, "Nothing to delete — this update hasn't been saved yet.");

  const { data: existing, error: readError } = await supabase
    .from("daily_reports")
    .select("project_id,engineer_id,status")
    .eq("id", reportId)
    .maybeSingle();
  if (readError) fail(projectId, `Couldn't delete the update: ${readError.message}`);
  if (!existing) fail(projectId, "That update no longer exists — reload the page.");
  try {
    await assertProjectAccess(supabase, existing.project_id, ctx);
  } catch {
    fail(projectId, "You're not assigned to this report's project.");
  }
  if (existing.engineer_id !== ctx.userId) fail(projectId, "You can only delete your own updates.");
  if (existing.status === "approved") fail(projectId, "Approved updates can't be deleted. Ask the Owner if it needs to be removed.");

  for (const table of ["daily_report_labour", "daily_report_materials", "daily_report_photos"] as const) {
    const { error } = await supabase.from(table).delete().eq("daily_report_id", reportId);
    if (error) fail(projectId, `Couldn't delete the update: ${error.message}`);
  }
  const { error } = await supabase.from("daily_reports").delete().eq("id", reportId);
  if (error) fail(projectId, `Couldn't delete the update: ${error.message}`);

  revalidatePath("/engineer/report");
  revalidatePath("/engineer");
  redirect(`/engineer/report?project=${encodeURIComponent(existing.project_id)}&done=deleted`);
}
