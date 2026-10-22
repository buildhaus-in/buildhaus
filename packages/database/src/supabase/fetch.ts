// fetch wrapper handed to every server-side Supabase client (server.ts,
// admin.ts, middleware.ts). Node's fetch waits up to 5 minutes for a
// response, so a single stalled connection to the database (seen live: a
// portal request hanging until the browser gave up — the "stuck on
// Signing in… / Creating…" reports) froze the whole page or form. Every
// request now has a time limit; a read that stalls or drops is retried
// once on a fresh attempt, while a write is never retried (it may already
// have been applied) and instead surfaces a clear error the user can act on.
// Uses AbortController rather than AbortSignal.timeout/any so it also runs
// in the Edge runtime (middleware).

const READ_TIMEOUT_MS = 10_000;
const WRITE_TIMEOUT_MS = 25_000;
const TIMEOUT_MESSAGE = "The database took too long to respond — please try again.";

function isRead(init?: RequestInit): boolean {
  const method = (init?.method ?? "GET").toUpperCase();
  return method === "GET" || method === "HEAD";
}

async function attempt(input: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const outer = init?.signal;
  if (outer?.aborted) controller.abort(outer.reason);
  const onOuterAbort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", onOuterAbort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (timedOut) throw new Error(TIMEOUT_MESSAGE);
    throw e;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
  }
}

export async function timedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!isRead(init)) return attempt(input, init, WRITE_TIMEOUT_MS);
  try {
    return await attempt(input, init, READ_TIMEOUT_MS);
  } catch (e) {
    // Caller cancelled on purpose — don't retry.
    if (init?.signal?.aborted) throw e;
    return attempt(input, init, READ_TIMEOUT_MS);
  }
}
