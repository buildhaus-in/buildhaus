import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "../demo/mode";
import { createDemoClient } from "../demo/client";

// Privileged client — SERVICE ROLE. Import ONLY in server actions/route
// handlers, never in a client component. Bypasses RLS, so every caller must
// first verify the acting user is the Owner.
export function createAdminClient(): any {
  if (isDemoMode()) return createDemoClient({ admin: true });
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
