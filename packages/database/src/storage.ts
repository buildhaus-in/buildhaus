import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { isDemoMode } from "./demo/mode";
import { createAdminClient } from "./supabase/admin";

// Storage abstraction: Demo Mode writes to disk under .demo-data/uploads and
// serves files back via the portal's /uploads/[...path] Route Handler; real
// Supabase Storage uploads to a private bucket instead (below), but returns
// the exact same "/uploads/<folder>/<generated-name>.<ext>" URL shape either
// way — every place that stores/reads a file_url/url column (documents,
// drawing_revisions, daily_report_photos) needs zero changes, because that
// route resolves the URL to either a disk read or a signed Storage URL
// depending on which mode is active. Callers (Server Actions only — this
// module is server-only) never need to know which branch ran.

// Maps the "kind" folder segment every uploadFile() call site already uses
// (owner/projects/actions.ts -> "documents", architect/drawings/actions.ts
// -> "drawings", engineer/report/actions.ts -> "daily-reports") to the real
// Supabase Storage bucket that holds it. All four buckets already exist in
// the real project with the correct project-scoped RLS policy — see
// supabase/migrations/0016_storage_project_scoping.sql, which expects
// exactly this convention: object key = "{projectId}/{filename}", first
// path segment read via storage.foldername(name)[1].
const BUCKET_BY_KIND: Record<string, string> = {
  documents: "documents",
  drawings: "drawings",
  "daily-reports": "site-photos",
};

export type UploadInput = {
  file: File | Buffer;
  filename: string;
  folder: string;
};

export type UploadResult = {
  url: string;
  path: string;
};

function uploadsRoot(): string {
  // Mirrors demo/db.ts's storeFile() convention exactly, so both the JSON
  // store and uploaded files live under the same shared .demo-data directory
  // that's already gitignored and already shared across apps/portal +
  // apps/website processes.
  const dir = process.env.DEMO_DATA_DIR
    ? path.resolve(process.env.DEMO_DATA_DIR)
    : path.resolve(process.cwd(), "../../.demo-data");
  return path.join(dir, "uploads");
}

// Collapses a folder segment to a safe charset — never trust caller input
// verbatim into a filesystem path.
function sanitizeSegment(segment: string, fallback: string): string {
  const cleaned = segment.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function safeFolder(folder: string): string {
  const segments = (folder || "")
    .split("/")
    .map((s) => sanitizeSegment(s, ""))
    .filter(Boolean);
  return segments.length ? segments.join("/") : "misc";
}

// Only the extension is kept from the client-supplied filename (for a
// correct Content-Type on download) — the base name is discarded entirely
// and replaced with crypto.randomUUID(), so a hostile filename (path
// traversal, null bytes, collisions) never reaches the disk or another
// user's file.
function safeExtension(filename: string): string {
  const ext = path.extname(filename || "").toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : "";
}

// Resolves a stored relative path (as returned in UploadResult.path) back to
// an absolute filesystem path, refusing anything that would escape the
// uploads root (defence in depth against "../" in a crafted URL — used by
// the Route Handler that serves these files back).
export function resolveUploadPath(relPath: string): string | null {
  const root = path.resolve(uploadsRoot());
  const full = path.resolve(root, (relPath || "").replace(/\\/g, "/"));
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

export async function uploadFile(input: UploadInput): Promise<UploadResult> {
  if (isDemoMode()) {
    const folder = safeFolder(input.folder);
    const ext = safeExtension(input.filename);
    const generatedName = `${crypto.randomUUID()}${ext}`;
    const relPath = `${folder}/${generatedName}`;

    const fullPath = resolveUploadPath(relPath);
    if (!fullPath) throw new Error("uploadFile: could not resolve a safe upload path.");

    const buffer = Buffer.isBuffer(input.file)
      ? input.file
      : Buffer.from(await input.file.arrayBuffer());

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);

    return { url: `/uploads/${relPath}`, path: relPath };
  }

  const folder = safeFolder(input.folder);
  const [kind, ...rest] = folder.split("/");
  const bucket = BUCKET_BY_KIND[kind];
  if (!bucket || rest.length === 0) {
    // Fail loudly rather than silently hand back a URL nothing can ever
    // resolve — every real call site's folder is "<kind>/<projectId>", so
    // hitting this means a new upload call site was added without adding
    // its kind to BUCKET_BY_KIND above.
    throw new Error(`uploadFile: no Supabase Storage bucket configured for upload kind "${kind}".`);
  }

  const ext = safeExtension(input.filename);
  const generatedName = `${crypto.randomUUID()}${ext}`;
  const objectKey = `${rest.join("/")}/${generatedName}`;

  const buffer = Buffer.isBuffer(input.file)
    ? input.file
    : Buffer.from(await input.file.arrayBuffer());
  // Only a real (browser) File has .type; a bare Buffer has no MIME info to
  // offer, so let Storage infer it from the extension in that case.
  const contentType = !Buffer.isBuffer(input.file) && input.file.type ? input.file.type : undefined;

  const admin = createAdminClient();
  const { error } = await admin.storage.from(bucket).upload(objectKey, buffer, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`uploadFile: Supabase Storage upload to bucket "${bucket}" failed: ${error.message}`);
  }

  // Same "/uploads/..." shape Demo Mode returns (see above) — the Route
  // Handler is what actually tells the two modes apart.
  const relPath = `${folder}/${generatedName}`;
  return { url: `/uploads/${relPath}`, path: relPath };
}

// Real-Storage counterpart to the Demo Mode disk read in
// apps/portal/src/app/uploads/[...path]/route.ts — called AFTER that
// route's own auth check (canViewProject()/owner), never before. These
// buckets are private, so a plain object URL 403s in a browser <img>/<a>;
// a short-lived signed URL is what actually lets the browser fetch it
// without attaching an Authorization header itself. Returns null if the
// kind is unrecognised or Storage rejects the lookup for any reason
// (including the object genuinely not existing) — the route turns null
// into its own 404, matching what the Demo Mode branch does for a missing
// file on disk.
export async function getSignedDownloadUrl(relPath: string): Promise<string | null> {
  const [kind, ...rest] = (relPath || "").split("/");
  const bucket = BUCKET_BY_KIND[kind];
  if (!bucket || rest.length === 0) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(rest.join("/"), 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
