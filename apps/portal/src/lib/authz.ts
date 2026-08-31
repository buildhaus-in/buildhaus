import "server-only";
import { getUserContext, type UserContext } from "@/lib/session";
import type { RoleKey } from "@/lib/rbac";

// Shared Owner-only guard for Server Actions. Most owner/*/actions.ts files
// currently redeclare their own private copy of this exact function —
// import this one in new/updated actions instead of adding yet another
// copy. It also gives callers a properly-scoped profile lookup (via
// getUserContext(), which filters by the signed-in user's id) rather than
// an unscoped `.from("profiles").select(...).maybeSingle()`, which in Demo
// Mode (no RLS — see apps/portal/src/lib/demo-scoping.ts) silently returns
// whichever profile happens to be first in the table.
export async function assertOwner(): Promise<UserContext & { profile: NonNullable<UserContext["profile"]> }> {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  if (!ctx.profile) throw new Error("No profile found for this account");
  return ctx as UserContext & { profile: NonNullable<UserContext["profile"]> };
}

// Generic "signed in AND holds this role" guard (Owner always passes too,
// since the Owner can act as any role). Use this in engineer/architect
// Server Actions instead of the `getUserContext()` + grab-`ctx.userId`
// pattern those files previously used — that pattern authenticated the
// caller but never checked their role, so a signed-in Client could invoke
// e.g. the Engineer's attendance/materials/report actions directly.
export async function assertRole(role: RoleKey): Promise<UserContext> {
  const ctx = await getUserContext();
  if (!ctx) throw new Error("Not authorised");
  if (!ctx.roles.includes(role) && !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

// Mirrors the real Postgres is_project_member() predicate
// (supabase/migrations/0003_crm_clients.sql) at the application layer: the
// Owner may touch any project; anyone else must have a project_members row
// for this exact project. Needed independently of RLS because Demo Mode has
// none (see apps/portal/src/lib/demo-scoping.ts's header comment) — call
// this from any Server Action that accepts a project_id from the client, so
// an assigned Engineer/Architect can't be redirected to write into a
// project_id belonging to a project they aren't on.
export async function assertProjectAccess(
  supabase: any,
  projectId: string,
  ctx: UserContext
): Promise<void> {
  if (ctx.roles.includes("owner")) return;
  const { data } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("profile_id", ctx.userId)
    .maybeSingle();
  if (!data) throw new Error("Not authorised for this project");
}

// Read-only counterpart, mirroring the real can_view_project() Postgres
// predicate (0003_crm_clients.sql): Owner OR an assigned project member OR
// the project's own client. Used by routes that serve a *file* rather than
// perform a write — e.g. apps/portal/src/app/uploads/[...path]/route.ts,
// which (unlike page renders) isn't covered by the (app) layout's role
// guard and has no RLS to fall back on in Demo Mode.
export async function canViewProject(
  supabase: any,
  projectId: string,
  ctx: UserContext
): Promise<boolean> {
  if (ctx.roles.includes("owner")) return true;
  const { data: member } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", projectId)
    .eq("profile_id", ctx.userId)
    .maybeSingle();
  if (member) return true;

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", ctx.userId)
    .maybeSingle();
  if (!client) return false;
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("client_id", client.id)
    .maybeSingle();
  return !!project;
}
