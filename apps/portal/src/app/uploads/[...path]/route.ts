import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isDemoMode, resolveUploadPath } from "@buildhaus/database";

// Serves files written by uploadFile() (packages/database/src/storage.ts) in
// Demo Mode. The uploaded file's URL (as stored in file_url/url columns) is
// literally "/uploads/<folder>/<generated-name>.<ext>" — this route reads it
// straight off disk and streams it back with a Content-Type inferred from
// the extension, so links saved by drawing_revisions.file_url,
// daily_report_photos.url and documents.file_url are actually viewable, not
// just recorded metadata. Real Supabase Storage (once configured) serves
// files directly from its own CDN URLs, so this route is a demo-only concern
// — it 404s once Demo Mode is off.
export const runtime = "nodejs";

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
