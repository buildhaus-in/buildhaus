import { NextResponse } from "next/server";
import { prepareDocumentUpload } from "@/app/(app)/owner/projects/actions";
import { prepareDrawingUpload } from "@/app/(app)/architect/drawings/actions";

// Issues a signed direct-to-Storage upload URL for <FileUpload direct> (see
// apps/portal/src/lib/uploads.ts). A plain Route Handler rather than a
// Server Action called from the picker's change handler: invoked that way
// on the live portal, the action request repeatedly never got a response
// (the same action answered in ~2s when called directly), so the picker
// sat on "Uploading… 0%". Auth, role and project-access checks all live in
// the two prepare functions — Route Handlers aren't covered by the (app)
// layout's guard, and these re-check everything themselves.
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }
  const meta = {
    name: String(body?.name ?? "").slice(0, 255),
    size: Number(body?.size) || 0,
    type: String(body?.type ?? "").slice(0, 100),
  };
  if (body?.target === "document") {
    return NextResponse.json(await prepareDocumentUpload(String(body.projectId ?? ""), meta));
  }
  if (body?.target === "drawing") {
    const ref = body.drawingId ? { drawingId: String(body.drawingId) } : { projectId: String(body.projectId ?? "") };
    return NextResponse.json(await prepareDrawingUpload(ref, meta));
  }
  return NextResponse.json({ ok: false, error: "Unknown upload target." }, { status: 400 });
}
