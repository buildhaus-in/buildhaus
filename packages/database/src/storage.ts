import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { isDemoMode } from "./demo/mode";

// Storage abstraction: Demo Mode writes to disk under .demo-data/uploads and
// serves files back via the portal's /uploads/[...path] Route Handler; real
// Supabase Storage is a TODO (see below). Callers (Server Actions only —
// this module is server-only) never need to know which branch ran; the
// return shape is identical either way.

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

  // TODO real Supabase Storage path — once a real Supabase project is
  // configured, implement this branch to upload `input.file` to a Storage
  // bucket (e.g. via createAdminClient().storage.from(bucket).upload(...))
  // and return its public/signed URL. Left unimplemented on purpose: a
  // misconfigured production deploy should fail loudly here rather than
  // silently pretend the upload worked and hand back a broken URL.
  throw new Error(
    "uploadFile: real Supabase Storage is not implemented — configure a Supabase Storage bucket and implement the non-demo branch in packages/database/src/storage.ts."
  );
}
