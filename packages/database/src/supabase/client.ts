"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser client. Uses the ANON key only — never the service role.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
