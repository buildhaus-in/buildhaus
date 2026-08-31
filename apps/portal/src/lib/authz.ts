import "server-only";
import { getUserContext, type UserContext } from "@/lib/session";

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
