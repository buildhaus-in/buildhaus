"use server";
import { createClient } from "@buildhaus/database";
import { revalidatePath } from "next/cache";

// Owner/Client-facing side of the drawing approval workflow. The Architect
// portal (src/app/(app)/architect/drawings/actions.ts) can draft, revise and
// submit a drawing, but only this side can move it through
// owner_review -> client_review -> approved -> approved_for_construction, or
// bounce it back to the architect via revision_requested. This enforces "the
// Architect cannot approve their own final drawing."

async function stampCurrentRevision(drawingId: string, status: string, notes?: string) {
  const supabase = createClient();
  const { data: drawing } = await supabase
    .from("drawings")
    .select("current_revision")
    .eq("id", drawingId)
    .maybeSingle();
  if (!drawing) return;

  const patch: Record<string, any> = { status };
  if (notes) patch.notes = notes;
  await supabase
    .from("drawing_revisions")
    .update(patch)
    .eq("drawing_id", drawingId)
    .eq("revision_no", drawing.current_revision);
}

export async function requestRevision(drawingId: string, formData: FormData) {
  const supabase = createClient();
  const notes = String(formData.get("notes") || "");
  await supabase.from("drawings").update({ status: "revision_requested" }).eq("id", drawingId);
  await stampCurrentRevision(drawingId, "revision_requested", notes);
  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
  revalidatePath("/architect/reviews");
}

export async function sendToClient(drawingId: string) {
  const supabase = createClient();
  await supabase.from("drawings").update({ status: "client_review" }).eq("id", drawingId);
  await stampCurrentRevision(drawingId, "client_review");
  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
  revalidatePath("/architect/reviews");
}

export async function approveDrawing(drawingId: string) {
  const supabase = createClient();
  await supabase.from("drawings").update({ status: "approved" }).eq("id", drawingId);
  await stampCurrentRevision(drawingId, "approved");
  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
}

// Advances a drawing to approved_for_construction and supersedes every OTHER
// revision of that drawing — the one durable rule this whole workflow exists
// to enforce (only one revision may ever be the live, buildable one).
export async function approveForConstruction(drawingId: string) {
  const supabase = createClient();
  const { data: drawing } = await supabase
    .from("drawings")
    .select("current_revision")
    .eq("id", drawingId)
    .maybeSingle();
  if (!drawing) return;

  await supabase.from("drawings").update({ status: "approved_for_construction" }).eq("id", drawingId);
  await stampCurrentRevision(drawingId, "approved_for_construction");

  const { data: revisions } = await supabase
    .from("drawing_revisions")
    .select("id,revision_no")
    .eq("drawing_id", drawingId);
  for (const r of revisions ?? []) {
    if (r.revision_no !== drawing.current_revision) {
      await supabase.from("drawing_revisions").update({ status: "superseded" }).eq("id", r.id);
    }
  }

  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
}
