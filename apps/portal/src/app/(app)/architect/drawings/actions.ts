"use server";
import { createClient, uploadFile } from "@buildhaus/database";
import { validateFile } from "@buildhaus/utils";
// `File` only became a Node.js global in v20 — nothing here previously
// imported it, so `instanceof File` below crashed with "File is not
// defined" on Node 18. node:buffer has exported a stable File since
// Node 18.13; aliased rather than shadowing the ambient DOM `File` type
// this file's own annotations (and uploadFile()'s signature) already rely
// on — only used for the runtime `instanceof` check below, never as a type.
import { File as NodeFile } from "node:buffer";
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

// Server-side re-validation of the uploaded file — the <FileUpload>
// component in @buildhaus/ui already checks this client-side for fast
// feedback, but the client can never be trusted alone.
async function uploadDrawingFile(formData: FormData, folder: string): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof NodeFile) || file.size <= 0) {
    return { error: "Please choose a file to upload." };
  }
  // Narrowed to node:buffer's File (see the import comment above), not the
  // ambient DOM File type validateFile()/uploadFile() declare — functionally
  // compatible (both only ever use .size/.type/.arrayBuffer()/.name here).
  const webFile = file as unknown as File;
  const validationError = validateFile(webFile, "drawing");
  if (validationError) return { error: validationError };

  const { url } = await uploadFile({ file: webFile, filename: webFile.name, folder });
  return { url };
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

  const uploaded = await uploadDrawingFile(formData, `drawings/${projectId}`);
  if (uploaded.error) return { error: uploaded.error };

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
      issue_date: null,
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
  const uploaded = await uploadDrawingFile(formData, `drawings/${drawing.project_id}`);
  if (uploaded.error) return { error: uploaded.error };

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
