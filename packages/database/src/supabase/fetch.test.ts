// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { timedFetch } from "./fetch";

// A fetch that never answers until its signal aborts — the live failure mode.
function hangingFetch() {
  return vi.fn((_input: any, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("timedFetch", () => {
  it("passes a normal response straight through", async () => {
    const ok = new Response("ok");
    vi.stubGlobal("fetch", vi.fn(async () => ok));
    await expect(timedFetch("https://x.test/rest")).resolves.toBe(ok);
  });

  it("retries a stalled read once, then fails with a clear message", async () => {
    vi.useFakeTimers();
    const f = hangingFetch();
    vi.stubGlobal("fetch", f);
    const p = timedFetch("https://x.test/rest", { method: "GET" });
    const assertion = expect(p).rejects.toThrow("The database took too long to respond");
    await vi.advanceTimersByTimeAsync(20_001);
    await assertion;
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("recovers when the retry of a stalled read succeeds", async () => {
    vi.useFakeTimers();
    const ok = new Response("ok");
    const f = vi
      .fn()
      .mockImplementationOnce(hangingFetch())
      .mockImplementationOnce(async () => ok);
    vi.stubGlobal("fetch", f);
    const p = timedFetch("https://x.test/rest");
    await vi.advanceTimersByTimeAsync(10_001);
    await expect(p).resolves.toBe(ok);
  });

  it("never retries a write (it may already have been applied)", async () => {
    vi.useFakeTimers();
    const f = hangingFetch();
    vi.stubGlobal("fetch", f);
    const p = timedFetch("https://x.test/rest", { method: "POST", body: "{}" });
    const assertion = expect(p).rejects.toThrow("The database took too long to respond");
    await vi.advanceTimersByTimeAsync(25_001);
    await assertion;
    expect(f).toHaveBeenCalledTimes(1);
  });
});
