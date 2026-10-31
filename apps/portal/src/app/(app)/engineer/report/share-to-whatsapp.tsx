"use client";
import { useState } from "react";

// "Share to WhatsApp" for a submitted daily report: the engineer's phone opens
// its share sheet with the report summary and the actual site photos, they
// pick the project's WhatsApp group and tap Send. Nothing is posted
// automatically — WhatsApp has no supported way for a website to post into a
// group, so the engineer always does the final send.
//
// Photos live in a private bucket behind /uploads/… (signed-in portal users
// only), so links would be useless to the group: the files are fetched here,
// with the engineer's own session, and attached. Where the browser can't
// attach files (most desktops), it falls back to a text-only WhatsApp message.

type Photo = { url: string; caption: string | null };

const WHATSAPP_GREEN = "bg-[#25D366] hover:bg-[#1EBE5A]";

async function photoFiles(photos: Photo[]): Promise<File[]> {
  const files: File[] = [];
  for (const [i, p] of photos.entries()) {
    const res = await fetch(p.url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Photo ${i + 1} couldn't be loaded (${res.status}).`);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    files.push(new File([blob], `site-photo-${i + 1}.${ext}`, { type: blob.type || "image/jpeg" }));
  }
  return files;
}

export function ShareReportToWhatsApp({ text, photos }: { text: string; photos: Photo[] }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  async function share() {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      // iOS WhatsApp often drops the text when photos are attached, so the
      // summary also goes on the clipboard to paste as the caption.
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        // Clipboard can be blocked; sharing still works without it.
      }

      const files = photos.length > 0 ? await photoFiles(photos) : [];
      if (files.length > 0 && navigator.canShare?.({ files })) {
        await navigator.share({ files, text });
        setStatus({
          tone: "ok",
          message: copied
            ? `Shared ${files.length} photo(s). If the report text didn't come through, paste it — it's copied.`
            : `Shared ${files.length} photo(s).`,
        });
      } else if (files.length === 0 && navigator.share) {
        await navigator.share({ text });
        setStatus({ tone: "ok", message: "Shared." });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        setStatus({
          tone: "ok",
          message:
            photos.length > 0
              ? "Opened WhatsApp with the report text. This browser can't attach photos — share from your phone to include them."
              : "Opened WhatsApp with the report text.",
        });
      }
    } catch (e) {
      // Closing the share sheet without picking anyone isn't an error.
      if (e instanceof DOMException && e.name === "AbortError") {
        setStatus(null);
      } else {
        setStatus({ tone: "error", message: e instanceof Error ? e.message : "Couldn't open WhatsApp. Please try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${WHATSAPP_GREEN}`}
      >
        {busy ? (
          <><span className="spinner" /> Preparing photos…</>
        ) : (
          <>
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 shrink-0 fill-white">
              <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.43 9.43 0 0 1-4.81-1.32l-.34-.2-3.58.94.96-3.49-.23-.36a9.42 9.42 0 0 1-1.45-5.03c0-5.21 4.24-9.45 9.46-9.45 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.24 9.45-9.46 9.45zm8.05-17.5A11.3 11.3 0 0 0 12.04.67C5.77.67.66 5.77.66 12.04c0 2 .52 3.96 1.52 5.69L.57 23.33l5.73-1.5a11.33 11.33 0 0 0 5.73 1.47h.01c6.27 0 11.38-5.1 11.38-11.37 0-3.04-1.18-5.9-3.33-8.04z" />
            </svg>
            Share to WhatsApp group
          </>
        )}
      </button>
      {status && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${status.tone === "ok" ? "border-ok/40 bg-ok/10 text-ok" : "border-danger/40 bg-danger/10 text-danger"}`}>
          {status.message}
        </div>
      )}
    </div>
  );
}
