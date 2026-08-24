// Client-safe upload constraints — deliberately kept out of @buildhaus/database
// (which is import "server-only" internally) so both the "use client"
// <FileUpload> component (fast client-side feedback) and the "use server"
// Server Actions (the check that actually matters — never trust the client
// alone) can validate against the exact same rules without either side
// pulling in server-only code.

export type UploadKind = "drawing" | "photo" | "document";

export const UPLOAD_LIMITS: Record<
  UploadKind,
  { maxSizeBytes: number; mimeTypes: string[]; accept: string; label: string }
> = {
  drawing: {
    maxSizeBytes: 10 * 1024 * 1024,
    mimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
    accept: "application/pdf,image/png,image/jpeg,image/webp",
    label: "PDF or image, max 10MB",
  },
  photo: {
    maxSizeBytes: 5 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
    accept: "image/*",
    label: "Image, max 5MB",
  },
  document: {
    maxSizeBytes: 10 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    accept:
      "application/pdf,image/png,image/jpeg,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    label: "PDF, image, Word or Excel, max 10MB",
  },
};

function humanSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1)}MB`;
}

// Returns an error message, or null if the file passes. Works against both a
// real browser File and the FormData-derived File the Server Action sees —
// both expose `.size` and `.type`.
export function validateFile(
  file: { size: number; type: string },
  kind: UploadKind
): string | null {
  const limits = UPLOAD_LIMITS[kind];
  if (file.size <= 0) return "File is empty.";
  if (file.size > limits.maxSizeBytes) {
    return `File is too large (${humanSize(file.size)}) — max ${humanSize(limits.maxSizeBytes)}.`;
  }
  // Some browsers/OSes leave `type` blank for a handful of extensions — only
  // reject when we got a MIME type back and it's not on the allowlist, so we
  // don't false-positive-block a valid file just because the browser didn't
  // report a type. The server-side check in the Server Action is the real
  // gate; this is best-effort UX on both sides.
  if (file.type && !limits.mimeTypes.includes(file.type)) {
    return `Unsupported file type (${file.type}). Allowed: ${limits.label}.`;
  }
  return null;
}
