"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError, logAudit } from "@/lib/mutation";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/owner/clients");
  revalidatePath("/owner");
  revalidatePath("/client/approvals");
}

// A decided approval (approved, or rejected-and-not-yet-reworked) is meant
// to stay exactly as the client left it — that's the record of what they
// actually decided. Every write below previously trusted the calling page
// to only ever render its button in the right state (owner/clients/page.tsx
// only shows "resend" on rejected/changes_requested rows) and applied the
// same unconditional update regardless of the row's actual current status.
// That's invisible in normal use — the UI genuinely does gate correctly —
// but a Server Action is a real POST endpoint independent of the page that
// rendered it: a stale tab, a replayed request, or a second click racing a
// revalidation can still reach it with the row already in a different
// state, silently wiping decided_at/client_response with no trace beyond
// the generic audit_row() trigger (packages/database/src/demo/db.ts's
// AUDIT_TABLES mirror included as of this pass) recording only "an update
// happened," not that it overwrote a real decision. Re-checking the
// server-fetched row's actual status — never the client's word for it —
// closes that gap without touching the UI at all.
const RESENDABLE_APPROVAL_STATUSES = new Set(["rejected", "changes_requested"]);

// A rejected/changes-requested approval gets reworked off-platform, then the
// Owner resends it to the client for another look.
export async function resendApproval(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;

  const { data: approval } = await supabase
    .from("client_approvals")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (!approval) throw new Error("Approval not found.");
  if (!RESENDABLE_APPROVAL_STATUSES.has(approval.status)) {
    throw new Error(`Can't resend an approval that's currently "${approval.status.replace(/_/g, " ")}" — only a rejected or changes-requested approval can be reworked and resent.`);
  }

  throwIfError(
    await supabase.from("client_approvals").update({
      status: "sent_to_client",
      sent_at: new Date().toISOString(),
      decided_at: null,
      client_response: null,
    }).eq("id", id),
    "Couldn't resend the approval to the client."
  );
  await logAudit(supabase, {
    action: "resend_approval",
    entityType: "client_approvals",
    entityId: id,
    summary: `Resent approval to client after rework (was ${approval.status.replace(/_/g, " ")})`,
  });

  revalidateAll();
}

// A change request only makes sense to (re-)price while it's still open —
// see the guard's rationale above resendApproval. crOpen already excludes
// completed/rejected/cancelled/client_approved rows from even rendering the
// form, but the action itself shouldn't rely on that.
const NON_PRICEABLE_CR_STATUSES = new Set(["completed", "rejected", "cancelled", "client_approved"]);

export async function priceChangeRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  const costImpact = Number(formData.get("cost_impact") || 0) || null;
  const timelineImpactDays = Number(formData.get("timeline_impact_days") || 0) || null;
  if (!id) return;

  const { data: cr } = await supabase.from("change_requests").select("id,status").eq("id", id).maybeSingle();
  if (!cr) throw new Error("Change request not found.");
  if (NON_PRICEABLE_CR_STATUSES.has(cr.status)) {
    throw new Error(`Can't price a change request that's already "${cr.status.replace(/_/g, " ")}".`);
  }

  throwIfError(
    await supabase.from("change_requests").update({
      status: "cost_time_shared",
      cost_impact: costImpact,
      timeline_impact_days: timelineImpactDays,
    }).eq("id", id),
    "Couldn't share cost/time impact with the client."
  );

  revalidatePath("/owner/clients");
  revalidatePath("/owner");
}

export async function rejectChangeRequest(formData: FormData) {
  await assertOwner();
  const supabase = createClient();
  const id = String(formData.get("id") || "");
  if (!id) return;

  const { data: cr } = await supabase.from("change_requests").select("id,status").eq("id", id).maybeSingle();
  if (!cr) throw new Error("Change request not found.");
  if (NON_PRICEABLE_CR_STATUSES.has(cr.status)) {
    throw new Error(`Can't reject a change request that's already "${cr.status.replace(/_/g, " ")}".`);
  }

  throwIfError(
    await supabase.from("change_requests").update({ status: "rejected" }).eq("id", id),
    "Couldn't reject the change request."
  );
  revalidatePath("/owner/clients");
  revalidatePath("/owner");
}
