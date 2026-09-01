import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isDemoMode } from "../demo/mode";
import { createDemoClient } from "../demo/client";
import { requireSupabaseEnv } from "../env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Server client for Server Components, Route Handlers and Server Actions.
// All queries run as the signed-in user, so RLS is always enforced.
// In Demo Mode (no Supabase project configured) this transparently returns
// an in-memory mock with the same .from()/.auth/.rpc surface — every
// Server Component and Server Action below works unmodified either way.
export function createClient(): any {
  if (isDemoMode()) return createDemoClient();
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = cookies();
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — safe to ignore; the
            // middleware refreshes the session cookie.
          }
        },
      },
    }
  );
}
