import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "../demo/mode";
import { createDemoClient } from "../demo/client";
import { requireServiceRoleKey, requireSupabaseEnv } from "../env";

// Privileged client — SERVICE ROLE. Import ONLY in server actions/route
// handlers, never in a client component. Bypasses RLS, so every caller must
// first verify the acting user is the Owner.
export function createAdminClient(): any {
  if (isDemoMode()) return createDemoClient({ admin: true });
  const { url } = requireSupabaseEnv();
  const serviceRoleKey = requireServiceRoleKey();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
