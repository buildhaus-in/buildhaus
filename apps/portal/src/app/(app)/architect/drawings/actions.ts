"use server";
import { createClient } from "@buildhaus/database";
import { prepareUpload, receiveFile, type FileMeta, type PrepareUploadResult } from "@/lib/uploads";
import { assertProjectAccess, assertRole } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Architect-side drawing workflow. The Architect can draft a drawing, create
// revisions, and submit to the Owner — but can never move a drawing into
// `approved` / `approved_for_construction` (that's an Owner/Client action;
// see src/app/(app)/owner/drawings/actions.ts for the approval-side state
// transitions, including the "supersede every other revision" step).
//
// All three actions below previously only checked "is anyone signed in"
// (getUserContext() used solely to grab ctx.userId for the uploaded_by
// column) — never the caller's role, and never whether they're actually a
// member of the project_id/drawing they were operating on. Now each asserts
// the "architect" role (assertRole also lets the Owner through) and, for
// project-scoped writes, assertProjectAccess — which mirrors the real
// is_project_member() RLS predicate at the app layer, since Demo Mode has
// no RLS to fall back on (apps/portal/src/lib/demo-scoping.ts).

export type DrawingFormState = { error: string } | null;

// Issues a signed direct-to-Storage upload for a drawing file (see
// apps/portal/src/lib/uploads.ts) once the caller is confirmed as an
// Architect/Owner on the project. Pass either the chosen project (new
// drawing) or the drawing being revised.
export async function prepareDrawingUpload(
  target: { projectId?: string; drawingId?: string },
  meta: FileMeta
): Promise<PrepareUploadResult> {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("architect");
  } catch {
    return { ok: false, error: "You must be signed in as an Architect to upload a drawing." };
  }
  let projectId = target.projectId ?? "";
  if (target.drawingId) {
    const { data: drawing } = await supabase.from("drawings").select("project_id").eq("id", target.drawingId).maybeSingle();
    if (!drawing) return { ok: false, error: "Drawing not found." };
    projectId = drawing.project_id;
  }
  if (!projectId) return { ok: false, error: "Select a project before choosing the file." };
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return { ok: false, error: "You are not assigned to this project." };
  }
  return prepareUpload(meta, "drawing", `drawings/${projectId}`);
}

export async function createDrawing(_prevState: DrawingFormState, formData: FormData): Promise<DrawingFormState> {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("architect");
  } catch {
    return { error: "You must be signed in as an Architect to upload a drawing." };
  }

  const projectId = String(formData.get("project_id") || "");
  if (!projectId) return { error: "Please select a project." };
  try {
    await assertProjectAccess(supabase, projectId, ctx);
  } catch {
    return { error: "You are not assigned to this project." };
  }

  const uploaded = await receiveFile(formData, "file", "drawing", `drawings/${projectId}`);
  if ("error" in uploaded) return { error: uploaded.error };

  const { data: drawing, error: drawingError } = await supabase
    .from("drawings")
    .insert({
      project_id: projectId,
      drawing_no: String(formData.get("drawing_no") || ""),
      title: String(formData.get("title") || "Untitled drawing"),
      discipline: String(formData.get("discipline") || "architectural"),
      floor: String(formData.get("floor") || "") || null,
      status: "draft",
      current_revision: 0,
    })
    .select()
    .single();

  if (drawingError) return { error: drawingError.message || "Could not create the drawing — please try again." };
  if (!drawing) return { error: "Could not create the drawing — please try again." };

  const { error: revisionError } = await supabase.from("drawing_revisions").insert({
    drawing_id: drawing.id,
    revision_no: 0,
    status: "draft",
    file_url: uploaded.url,
    notes: String(formData.get("notes") || ""),
    uploaded_by: ctx.userId,
  });
  if (revisionError) return { error: revisionError.message || "Drawing created, but the file couldn't be saved." };

  revalidatePath("/architect/drawings");
  redirect(`/architect/drawings/${drawing.id}`);
}

export async function createRevision(
  drawingId: string,
  _prevState: DrawingFormState,
  formData: FormData
): Promise<DrawingFormState> {
  const supabase = createClient();
  let ctx;
  try {
    ctx = await assertRole("architect");
  } catch {
    return { error: "You must be signed in as an Architect to upload a revision." };
  }

  const { data: drawing } = await supabase
    .from("drawings")
    .select("id,project_id,current_revision")
    .eq("id", drawingId)
    .maybeSingle();
  if (!drawing) return { error: "Drawing not found." };
  try {
    await assertProjectAccess(supabase, drawing.project_id, ctx);
  } catch {
    return { error: "You are not assigned to this project." };
  }

  // Keyed by project_id (not drawingId) — consistent with createDrawing's
  // folder above, and required so the /uploads route and the real-Supabase
  // storage.objects RLS policy (both project-scoped by path) can resolve
  // which project this file belongs to from the path alone.
  const uploaded = await receiveFile(formData, "file", "drawing", `drawings/${drawing.project_id}`);
  if ("error" in uploaded) return { error: uploaded.error };

  const { error: revisionError } = await supabase.from("drawing_revisions").insert({
    drawing_id: drawingId,
    revision_no: (drawing.current_revision ?? 0) + 1,
    status: "draft",
    file_url: uploaded.url,
    notes: String(formData.get("notes") || ""),
    uploaded_by: ctx.userId,
  });
  if (revisionError) return { error: revisionError.message || "Couldn't save the revision." };

  // Deliberately does NOT touch drawings.status / current_revision — that
  // only advances once the architect explicitly submits (see submitToOwner).
  revalidatePath(`/architect/drawings/${drawingId}`);
  revalidatePath("/architect/drawings");
  revalidatePath("/architect/reviews");
  return null;
}

export async function submitToOwner(drawingId: string, revisionId: string) {
  const ctx = await assertRole("architect");
  const supabase = createClient();

  const { data: drawing } = await supabase
    .from("drawings")
    .select("id,project_id")
    .eq("id", drawingId)
    .maybeSingle();
  if (!drawing) return;
  await assertProjectAccess(supabase, drawing.project_id, ctx);

  const { data: revision } = await supabase
    .from("drawing_revisions")
    .select("id,revision_no")
    .eq("id", revisionId)
    .maybeSingle();
  if (!revision) return;

  throwIfError(
    await supabase
      .from("drawings")
      .update({ status: "owner_review", current_revision: revision.revision_no })
      .eq("id", drawingId),
    "Couldn't submit the drawing to the Owner."
  );
  throwIfError(
    await supabase.from("drawing_revisions").update({ status: "owner_review" }).eq("id", revisionId),
    "Couldn't update the revision status."
  );

  revalidatePath(`/architect/drawings/${drawingId}`);
  revalidatePath("/architect/drawings");
  revalidatePath("/architect/reviews");
  revalidatePath("/architect");
}
