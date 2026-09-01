"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError, unwrap } from "@/lib/mutation";
import type { ActionResult } from "@buildhaus/validation";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/owner/finance");
  revalidatePath("/owner");
  revalidatePath("/client");
  revalidatePath("/client/payments");
}

// Records a receipt against a project (optionally against a specific
// schedule milestone, which is then marked paid) and logs it in the unified
// `payments` ledger so the Command Centre cash position stays accurate.
export async function recordReceipt(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const scheduleId = String(formData.get("schedule_id") || "") || null;
  const amount = Number(formData.get("amount") || 0);
  const mode = String(formData.get("mode") || "bank_transfer");
  if (!projectId || !amount) return { ok: false, error: "Select a project and enter an amount." };

  // Demo Mode enforces no unique constraints at all (see
  // packages/database/src/demo/query-builder.ts), so the real Postgres
  // safeguard added in 0017_finance_ledger_integrity.sql — a partial
  // unique index rejecting a second receipt against the same
  // schedule_id — would silently do nothing here. Pre-check explicitly so
  // "record a receipt twice against the same milestone" fails the same way
  // (with a clear reason) in both environments, not just the real one.
  if (scheduleId) {
    const { data: existingReceipt } = await supabase
      .from("client_receipts")
      .select("id")
      .eq("schedule_id", scheduleId)
      .maybeSingle();
    if (existingReceipt) {
      return { ok: false, error: "This milestone already has a receipt recorded against it." };
    }
  }

  const receiptNo = `BH-RCPT-${Date.now().toString().slice(-6)}`;
  let result = unwrap(
    await supabase.from("client_receipts").insert({
      project_id: projectId,
      schedule_id: scheduleId,
      amount,
      receipt_date: new Date().toISOString().slice(0, 10),
      mode,
      receipt_no: receiptNo,
    }),
    "Couldn't record the receipt."
  );
  if (!result.ok) return result;

  // payments.organisation_id is NOT NULL on the real schema (see
  // 0007_labour_finance_quality.sql) — every insert here previously omitted
  // it, which Demo Mode's total lack of schema enforcement let through
  // silently but a real Postgres project would reject outright. Same fix
  // applied below in markSupplierBillPaid/markContractorBillPaid.
  result = unwrap(
    await supabase.from("payments").insert({
      organisation_id: ctx.profile!.organisation_id,
      project_id: projectId,
      direction: "inbound",
      amount,
      category: "client_receipt",
      payment_date: new Date().toISOString().slice(0, 10),
      created_by: ctx.userId,
    }),
    "Couldn't log the payment."
  );
  if (!result.ok) return result;

  if (scheduleId) {
    result = unwrap(
      await supabase.from("client_payment_schedules").update({ status: "paid" }).eq("id", scheduleId),
      "Couldn't mark the milestone as paid."
    );
    if (!result.ok) return result;
  }

  revalidateAll();
  return { ok: true, data: null };
}

export async function markSupplierBillPaid(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const billId = String(formData.get("bill_id") || "");
  if (!billId) return;

  const { data: bill } = await supabase.from("supplier_bills").select("id,project_id,outstanding").eq("id", billId).maybeSingle();
  if (!bill) return;

  throwIfError(
    await supabase.from("supplier_bills").update({ outstanding: 0 }).eq("id", billId),
    "Couldn't mark the supplier bill as paid."
  );
  throwIfError(
    await supabase.from("payments").insert({
      organisation_id: ctx.profile!.organisation_id,
      project_id: bill.project_id,
      direction: "outbound",
      amount: bill.outstanding,
      category: "supplier_payment",
      payment_date: new Date().toISOString().slice(0, 10),
      created_by: ctx.userId,
    }),
    "Couldn't log the payment."
  );

  revalidatePath("/owner/finance");
  revalidatePath("/owner");
}

export async function markContractorBillPaid(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const billId = String(formData.get("bill_id") || "");
  if (!billId) return;

  const { data: bill } = await supabase.from("contractor_bills").select("id,project_id,outstanding").eq("id", billId).maybeSingle();
  if (!bill) return;

  throwIfError(
    await supabase.from("contractor_bills").update({ outstanding: 0 }).eq("id", billId),
    "Couldn't mark the contractor bill as paid."
  );
  throwIfError(
    await supabase.from("payments").insert({
      organisation_id: ctx.profile!.organisation_id,
      project_id: bill.project_id,
      direction: "outbound",
      amount: bill.outstanding,
      category: "labour_payment",
      payment_date: new Date().toISOString().slice(0, 10),
      created_by: ctx.userId,
    }),
    "Couldn't log the payment."
  );

  revalidatePath("/owner/finance");
  revalidatePath("/owner/labour");
  revalidatePath("/owner");
}

export async function recordExpense(
  _prevState: ActionResult<null> | null,
  formData: FormData
): Promise<ActionResult<null>> {
  let ctx;
  try {
    ctx = await assertOwner();
  } catch {
    return { ok: false, error: "You must be signed in as the Owner." };
  }
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "") || null;
  const amount = Number(formData.get("amount") || 0);
  if (!amount) return { ok: false, error: "Enter an amount." };

  const result = unwrap(
    await supabase.from("expenses").insert({
      organisation_id: ctx.profile!.organisation_id,
      project_id: projectId,
      category: String(formData.get("category") || "other"),
      amount,
      expense_date: new Date().toISOString().slice(0, 10),
      notes: String(formData.get("notes") || ""),
    }),
    "Couldn't record the expense."
  );
  if (!result.ok) return result;

  revalidatePath("/owner/finance");
  return { ok: true, data: null };
}
