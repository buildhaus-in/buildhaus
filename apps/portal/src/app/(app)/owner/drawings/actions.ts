"use server";
import { createClient } from "@buildhaus/database";
import { revalidatePath } from "next/cache";
import { assertOwner } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";

// Owner/Client-facing side of the drawing approval workflow. The Architect
// portal (src/app/(app)/architect/drawings/actions.ts) can draft, revise and
// submit a drawing, but only this side can move it through
// owner_review -> client_review -> approved -> approved_for_construction, or
// bounce it back to the architect via revision_requested. This enforces "the
// Architect cannot approve their own final drawing."
//
// That guarantee previously existed only in the UI (these buttons simply
// weren't rendered for an Architect) — none of the four functions below
// checked the caller's role, so any authenticated user, including the
// Architect who drafted the drawing, could invoke approveForConstruction
// directly. Every function now asserts Owner first.

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
  throwIfError(
    await supabase
      .from("drawing_revisions")
      .update(patch)
      .eq("drawing_id", drawingId)
      .eq("revision_no", drawing.current_revision),
    "Couldn't update the drawing revision."
  );
}

export async function requestRevision(drawingId: string, formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const notes = String(formData.get("notes") || "");
  throwIfError(
    await supabase.from("drawings").update({ status: "revision_requested" }).eq("id", drawingId),
    "Couldn't request a revision."
  );
  await stampCurrentRevision(drawingId, "revision_requested", notes);
  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
  revalidatePath("/architect/reviews");
}

export async function sendToClient(drawingId: string) {
  await assertOwner();
  const supabase = createClient();
  throwIfError(
    await supabase.from("drawings").update({ status: "client_review" }).eq("id", drawingId),
    "Couldn't send the drawing to the client."
  );
  await stampCurrentRevision(drawingId, "client_review");
  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
  revalidatePath("/architect/reviews");
}

export async function approveDrawing(drawingId: string) {
  await assertOwner();
  const supabase = createClient();
  throwIfError(
    await supabase.from("drawings").update({ status: "approved" }).eq("id", drawingId),
    "Couldn't approve the drawing."
  );
  await stampCurrentRevision(drawingId, "approved");
  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
}

// Advances a drawing to approved_for_construction and supersedes every OTHER
// revision of that drawing — the one durable rule this whole workflow exists
// to enforce (only one revision may ever be the live, buildable one).
export async function approveForConstruction(drawingId: string) {
  await assertOwner();
  const supabase = createClient();
  const { data: drawing } = await supabase
    .from("drawings")
    .select("current_revision")
    .eq("id", drawingId)
    .maybeSingle();
  if (!drawing) return;

  throwIfError(
    await supabase.from("drawings").update({ status: "approved_for_construction" }).eq("id", drawingId),
    "Couldn't approve the drawing for construction."
  );
  await stampCurrentRevision(drawingId, "approved_for_construction");

  const { data: revisions, error } = await supabase
    .from("drawing_revisions")
    .select("id,revision_no")
    .eq("drawing_id", drawingId);
  if (error) throw new Error(error.message || "Couldn't load the drawing's revisions.");
  for (const r of revisions ?? []) {
    if (r.revision_no !== drawing.current_revision) {
      throwIfError(
        await supabase.from("drawing_revisions").update({ status: "superseded" }).eq("id", r.id),
        "Couldn't supersede an older revision."
      );
    }
  }

  revalidatePath("/owner/drawings");
  revalidatePath(`/architect/drawings/${drawingId}`);
}
