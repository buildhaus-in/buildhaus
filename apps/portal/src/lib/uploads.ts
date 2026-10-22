import "server-only";
import { createDirectUpload, removeUpload, uploadFile, verifyDirectUpload } from "@buildhaus/database";
import { UPLOAD_LIMITS, validateFile, type UploadKind } from "@buildhaus/utils";

// Server half of <FileUpload direct={...}> (packages/ui/src/file-upload.tsx).
// Large files (drawings, documents — up to 10MB) can't pass through a
// Server Action on Vercel, whose request-body cap is 4.5MB, so the browser
// uploads them straight to Storage via a signed URL and the form submits
// only `<field>__path`. Every caller must have already checked the user's
// role and project access before calling either function here.

export type PrepareUploadResult =
  | { ok: true; mode: "inline" }
  | { ok: true; mode: "direct"; uploadUrl: string; path: string }
  | { ok: false; error: string };

export type FileMeta = { name: string; size: number; type: string };

// Validates the file's declared size/type up front (fast feedback; the real
// check is receiveFile() below, against Storage's own metadata) and issues a
// signed upload URL scoped to `folder`. Demo Mode → "inline".
export async function prepareUpload(meta: FileMeta, kind: UploadKind, folder: string): Promise<PrepareUploadResult> {
  const err = validateFile({ size: Number(meta.size) || 0, type: String(meta.type || "") }, kind);
  if (err) return { ok: false, error: err };
  try {
    const target = await createDirectUpload({ folder, filename: String(meta.name || "") });
    return target ? { ok: true, mode: "direct", ...target } : { ok: true, mode: "inline" };
  } catch (e) {
    console.error("prepareUpload failed", e);
    return { ok: false, error: "Couldn't start the upload — please try again." };
  }
}

function inlineFile(v: FormDataEntryValue | null): File | null {
  if (!v || typeof v === "string") return null;
  const f = v as unknown as File;
  return typeof f.arrayBuffer === "function" && typeof f.size === "number" && f.size > 0 ? f : null;
}

// Resolves the submitted file to its stored URL: a direct-uploaded path is
// verified (issued for this exact folder, real size/type within limits —
// rejected objects are deleted), otherwise an inline file is validated and
// uploaded as before.
export async function receiveFile(
  formData: FormData,
  field: string,
  kind: UploadKind,
  folder: string
): Promise<{ url: string } | { error: string }> {
  const directPath = String(formData.get(`${field}__path`) || "").trim();
  if (directPath) {
    const stored = await verifyDirectUpload(directPath, folder);
    if (!stored) return { error: "The uploaded file couldn't be found — please choose it again." };
    const limits = UPLOAD_LIMITS[kind];
    const err = validateFile({ size: stored.size || 1, type: stored.type }, kind);
    if (err || stored.size > limits.maxSizeBytes) {
      await removeUpload(directPath);
      return { error: err ?? `File is too large — ${limits.label}.` };
    }
    return { url: stored.url };
  }

  const file = inlineFile(formData.get(field));
  if (!file) return { error: "Please choose a file to upload." };
  const err = validateFile(file, kind);
  if (err) return { error: err };
  try {
    const { url } = await uploadFile({ file, filename: file.name, folder });
    return { url };
  } catch (e) {
    console.error("uploadFile failed", e);
    return { error: "Couldn't upload the file — please try again." };
  }
}
