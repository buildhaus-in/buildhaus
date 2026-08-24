import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";

// Client-portal scoping helper. Demo Mode has no Postgres RLS, so every
// Client Server Action must filter explicitly — this is the one place that
// does the clients -> projects lookup (mirrors the read in client/page.tsx)
// so Server Actions can authorize a mutation against "this signed-in
// client's own project" without re-deriving the logic in every actions.ts.
export async function getClientProjectId(): Promise<string | null> {
  const supabase = createClient();
  const ctx = await getUserContext();
  if (!ctx?.userId) return null;

  const { data: clientRow } = await supabase
    .from("clients").select("id").eq("profile_id", ctx.userId).maybeSingle();
  if (!clientRow) return null;

  const { data: project } = await supabase
    .from("projects").select("id").eq("client_id", clientRow.id).maybeSingle();
  return project?.id ?? null;
}
