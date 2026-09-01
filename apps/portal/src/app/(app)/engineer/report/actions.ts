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

// Previously only checked "is anyone signed in" — never role or project
// membership, so any authenticated user could write a daily report against
// any project_id. See engineer/attendance/actions.ts for the full rationale.
async function persistReport(formData: FormData, status: "draft" | "submitted") {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("site_engineer");
  } catch {
    return;
  }

  const projectId = String(formData.get("project_id") || "");
  const reportDate = String(formData.get("report_date") || "");
  const existingId = textOrNull(formData.get("report_id"));
  if (!projectId || !reportDate) return;
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return;
  }
  if (existingId) {
    // report_id is caller-supplied too — without this, an engineer could
    // pass their own project_id (so the check above passes) alongside
    // another project's report_id, and the update below would silently
    // reassign that other report to their project. Re-check access against
    // the report's ACTUAL project, not the one the form claims.
    const { data: existing } = await supabase
      .from("daily_reports")
      .select("project_id")
      .eq("id", existingId)
      .maybeSingle();
    if (!existing) return;
    try {
      await assertProjectAccess(supabase, existing.project_id, ctx);
    } catch {
      return;
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
    const file = formData.get(`photo_file_${i}`);
    if (file instanceof File && file.size > 0) {
      const validationError = validateFile(file, "photo");
      if (validationError) {
        redirect(
          `/engineer/report?project=${projectId}&error=${encodeURIComponent(`Photo ${i + 1}: ${validationError}`)}`
        );
      }
      photoUploads.push({ index: i, file });
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
    if (error) throw new Error(error.message || "Couldn't save the report.");
    reportId = created?.id ?? null;
  }
  if (!reportId) return;

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
    const upload = photoUploads.find((p) => p.index === i);
    let url = textOrNull(formData.get(`photo_existing_url_${i}`)); // kept unless replaced below
    if (upload) {
      const uploaded = await uploadFile({
        file: upload.file,
        filename: upload.file.name,
        folder: `daily-reports/${projectId}`,
      });
      url = uploaded.url;
    }
    if (url) {
      throwIfError(
        await supabase.from("daily_report_photos").insert({ daily_report_id: reportId, url, caption }),
        "Couldn't save a photo."
      );
    }
  }

  revalidatePath("/engineer/report");
  revalidatePath("/engineer");
}

export async function saveDraftReport(formData: FormData) {
  await persistReport(formData, "draft");
}

export async function submitReport(formData: FormData) {
  await persistReport(formData, "submitted");
}
