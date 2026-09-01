import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createClient, isDemoMode, resolveUploadPath } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { canViewProject } from "@/lib/authz";

// Serves files written by uploadFile() (packages/database/src/storage.ts) in
// Demo Mode. The uploaded file's URL (as stored in file_url/url columns) is
// literally "/uploads/<folder>/<generated-name>.<ext>" — this route reads it
// straight off disk and streams it back with a Content-Type inferred from
// the extension, so links saved by drawing_revisions.file_url,
// daily_report_photos.url and documents.file_url are actually viewable, not
// just recorded metadata. Real Supabase Storage (once configured) serves
// files directly from its own CDN URLs, so this route is a demo-only concern
// — it 404s once Demo Mode is off.
//
// This is a Route Handler, so — same caveat documented on
// owner/quotations/[id]/download/route.ts — it is NOT covered by the (app)
// layout's role guard (that only wraps page renders), and middleware.ts
// only checks "is anyone signed in" for /owner|/engineer|/architect|/client
// paths, which /uploads/* isn't one of. Previously this route had NO
// authorization at all: any request, signed in or not, that knew or
// guessed a path served the file. Every upload folder is keyed
// `${kind}/${projectId}/...` (documents/drawings/daily-reports — see the
// three uploadFile() call sites), so the second path segment is checked
// against canViewProject() the same way page renders already are.
export const runtime = "nodejs";

const PROJECT_SCOPED_KINDS = new Set(["documents", "drawings", "daily-reports"]);

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  if (!isDemoMode()) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const ctx = await getUserContext();
  if (!ctx) {
    return new NextResponse("Not authorised.", { status: 401 });
  }

  const [kind, projectId] = params.path ?? [];
  if (PROJECT_SCOPED_KINDS.has(kind) && projectId) {
    // Project-level, not per-row: a Client who can view this project at all
    // is allowed to fetch anything under its folder, even a document whose
    // `documents.client_visible` is false. Closing that fully would mean
    // resolving this exact generated filename back to its owning row (a
    // different lookup per kind) before every download. The residual risk
    // is accepted the same way this codebase already accepts it for
    // quotation_public_tokens (docs/SECURITY-CHECKLIST.md #2): the stored
    // filename is a crypto.randomUUID(), and normal usage never puts a
    // non-client-visible file's URL in a client's browser in the first
    // place (their Documents page only queries client_visible=true rows) —
    // so reaching this file still requires already having its exact,
    // unguessable URL, not just project access.
    const supabase = createClient();
    if (!(await canViewProject(supabase, projectId, ctx))) {
      return new NextResponse("Not authorised.", { status: 403 });
    }
  } else {
    // Unrecognised folder shape — fail closed rather than guess at scoping.
    if (!ctx.roles.includes("owner")) {
      return new NextResponse("Not authorised.", { status: 403 });
    }
  }

  const relPath = (params.path ?? []).join("/");
  const filePath = resolveUploadPath(relPath);
  if (!filePath) {
    return new NextResponse("Not found.", { status: 404 });
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return new NextResponse("Not found.", { status: 404 });
  }
  if (!stat.isFile()) {
    return new NextResponse("Not found.", { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
