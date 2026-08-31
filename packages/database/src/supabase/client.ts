"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client. Uses the ANON key only — never the service role. Not
// currently imported anywhere (every Server Component/Action uses
// ../supabase/server.ts's createClient() instead), but validated the same
// way in case that changes — a missing key should fail loudly here too,
// not construct a client with `undefined` baked in. NEXT_PUBLIC_* vars are
// inlined at build time, so this check runs in the browser bundle itself;
// it deliberately doesn't import ../env.ts (marked "server-only").
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "createClient() (browser): NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "are not set for this build."
    );
  }
  return createBrowserClient(url, anonKey);
}
