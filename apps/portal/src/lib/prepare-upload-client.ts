import type { DirectUploadPrep } from "@buildhaus/ui";

type Target =
  | { target: "document"; projectId: string }
  | { target: "drawing"; projectId?: string; drawingId?: string };

// Browser side of /api/uploads/prepare — passed as <FileUpload direct={…}>.
// Time-limited so a stalled request becomes a visible error, never an
// endless "Uploading… 0%".
export async function prepareUploadViaApi(
  target: Target,
  meta: { name: string; size: number; type: string }
): Promise<DirectUploadPrep> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch("/api/uploads/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...target, ...meta }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!data || typeof data.ok !== "boolean") return { ok: false, error: "Couldn't start the upload — please try again." };
    return data as DirectUploadPrep;
  } catch {
    return { ok: false, error: controller.signal.aborted ? "Starting the upload took too long — please try again." : "Couldn't reach the server — check your connection and try again." };
  } finally {
    clearTimeout(timer);
  }
}
