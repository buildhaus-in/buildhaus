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
  const isDisabled = disabled || pending;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError("");
    if (!file) {
      setFileName("");
      return;
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
      {pending && <div className="mt-1 text-xs text-brand">Uploading…</div>}
    </div>
  );
}
