"use client";
import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";
import { UPLOAD_LIMITS, validateFile, type UploadKind } from "@buildhaus/utils";

// A real <input type="file"> file picker — never a text field asking users
// to paste a URL. Client-side validation here is fast feedback only; the
// Server Action that receives the FormData re-validates with the exact same
// @buildhaus/utils rules (never trust the client alone). Must only import
// from @buildhaus/utils/react — never @buildhaus/database, whose demo
// internals are import "server-only" and would break the client bundle.
export function FileUpload({
  name,
  label,
  kind,
  required,
  helperText,
  disabled,
}: {
  name: string;
  label?: string;
  kind: UploadKind;
  required?: boolean;
  helperText?: string;
  disabled?: boolean;
}) {
  const limits = UPLOAD_LIMITS[kind];
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  // Reflects the pending state of the nearest ancestor <form>'s submission —
  // works here even though this is a Client Component nested inside a Server
  // Component's <form action={someServerAction}> tree, since it's all one
  // DOM tree at render time.
  const { pending } = useFormStatus();
  const [compressing, setCompressing] = useState(false);
  const isDisabled = disabled || pending || compressing;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    let file = input.files?.[0];
    setError("");
    if (!file) {
      setFileName("");
      return;
    }
    // Site photos straight off a phone camera are 3–6MB each, and the
    // production portal runs on Vercel, which rejects any request body over
    // 4.5MB before the Server Action ever sees it (not configurable — the
    // bodySizeLimit in next.config only raises Next's own cap). Shrinking
    // each photo here keeps a whole daily report (3 photos) well under that.
    if (kind === "photo") {
      setCompressing(true);
      try {
        const smaller = await shrinkPhoto(file);
        if (smaller !== file) {
          const dt = new DataTransfer();
          dt.items.add(smaller);
          input.files = dt.files;
          file = smaller;
        }
      } finally {
        setCompressing(false);
      }
    }
    const err = validateFile(file, kind);
    if (err) {
      setError(err);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFileName(file.name);
  }

  return (
    <div className="mb-3">
      {label && (
        <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">
          {label}
          {required && <span className="text-danger"> *</span>}
        </div>
      )}
      <label
        htmlFor={inputId}
        className={clsx(
          "flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2.5 text-sm transition",
          isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          error ? "border-danger bg-danger/5" : "border-border bg-surface hover:border-brand"
        )}
      >
        <span className={clsx("truncate", fileName ? "text-sandlight" : "text-muted")}>
          {fileName || "Choose file…"}
        </span>
        <span className="shrink-0 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-sand">
          Browse
        </span>
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        name={name}
        accept={limits.accept}
        required={required}
        disabled={isDisabled}
        onChange={handleChange}
        className="sr-only"
      />
      {error ? (
        <div className="mt-1 text-xs text-danger">{error}</div>
      ) : (
        <div className="mt-1 text-xs text-muted">{helperText ?? limits.label}</div>
      )}
      {compressing && <div className="mt-1 text-xs text-brand">Preparing photo…</div>}
      {pending && <div className="mt-1 text-xs text-brand">Uploading…</div>}
    </div>
  );
}

// Longest edge and JPEG quality for site photos — plenty for reading a
// report on any screen, and typically 300–800KB per photo.
const PHOTO_MAX_EDGE = 2000;
const PHOTO_QUALITY = 0.82;
// Already-small images are left untouched rather than recompressed.
const PHOTO_SKIP_BELOW_BYTES = 900 * 1024;

// Downscales and re-encodes an image to JPEG in the browser. Returns the
// original file whenever it's already small or the browser can't decode it
// (e.g. HEIC on Android Chrome) — validateFile() then judges it as before.
async function shrinkPhoto(file: File): Promise<File> {
  if (file.size <= PHOTO_SKIP_BELOW_BYTES || !file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await decodeImage(file);
    const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const g = canvas.getContext("2d");
    if (!g) return file;
    g.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if ("close" in bitmap) bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", PHOTO_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

// createImageBitmap honours EXIF orientation (so portrait phone shots stay
// upright); the <img> fallback covers older Safari.
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
