import "server-only";
import type { ActionResult } from "@buildhaus/validation";

// Supabase (real client or the Demo Mode mock — see
// packages/database/src/demo/query-builder.ts) never throws on a failed
// query: it always resolves to `{ data, error }`. Left unchecked, `error`
// is silent — the classic shape of "I clicked the button and nothing
// happened" bugs, e.g. RLS rejecting an insert or a unique-constraint
// violation on a duplicate code. `unwrap()` is the one place that turns a
// Supabase result into the ActionResult shape every hardened Server Action
// should return, so a rejected write always reaches the UI.
export function unwrap<T>(
  result: { data: T; error: { message?: string } | null },
  fallbackMessage: string
): ActionResult<T> {
  if (result.error) {
    return { ok: false, error: result.error.message || fallbackMessage };
  }
  return { ok: true, data: result.data };
}

// Companion to unwrap() for the many Server Actions in this codebase that
// are still plain `(formData: FormData) => Promise<void>` — wired to a bare
// `<form action={fn}>` with no useFormState/ActionResult channel back to
// the client, so there's nowhere to *return* an error to. Left completely
// unchecked (the pattern found throughout owner/*, engineer/*, client/*
// actions.ts before this pass), a rejected write was indistinguishable
// from success — the form just sat there. Throwing instead means the
// failure is no longer silent: the nearest error.tsx boundary (see
// apps/portal/src/app/(app)/error.tsx) renders a real "something went
// wrong, try again" screen instead of nothing happening. It's a strictly
// worse UX than a proper per-field error message (tracked as a follow-up —
// converting each of these to useFormState + ActionResult, the pattern
// owner/projects/actions.ts's createProject() and
// DocumentUploadForm/uploadDocument already use), but it closes the actual
// data-integrity bug: the write failing and nobody ever finding out.
export function throwIfError(
  result: { error: { message?: string } | null },
  fallbackMessage: string
): void {
  if (result.error) throw new Error(result.error.message || fallbackMessage);
}

// Records a human-readable audit trail entry for a mutation, via the same
// public.log_audit() Postgres function convert_lead_to_project() already
// calls (supabase/migrations/0011_triggers_functions.sql) — Demo Mode has
// a matching stand-in (packages/database/src/demo/rpc.ts) so this works
// unmodified in both environments.
//
// Note for tables already covered by a blanket `trg_audit_<table>` trigger
// (see the same migration's table list) this adds a second, descriptive
// row alongside the trigger's generic one — the same double-logging
// convert_lead_to_project() already produces today, kept deliberately
// consistent rather than papered over here.
export async function logAudit(
  supabase: any,
  entry: { action: string; entityType: string; entityId: string | null; summary: string }
): Promise<void> {
  await supabase.rpc("log_audit", {
    p_action: entry.action,
    p_entity_type: entry.entityType,
    p_entity_id: entry.entityId,
    p_summary: entry.summary,
  });
}
