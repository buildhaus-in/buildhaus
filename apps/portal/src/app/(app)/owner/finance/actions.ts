"use server";
import { createClient } from "@buildhaus/database";
import { assertOwner } from "@/lib/authz";
import { throwIfError } from "@/lib/mutation";
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
export async function recordReceipt(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "");
  const scheduleId = String(formData.get("schedule_id") || "");
  const amount = Number(formData.get("amount") || 0);
  const mode = String(formData.get("mode") || "bank_transfer");
  if (!projectId || !amount) return;

  const receiptNo = `BH-RCPT-${Date.now().toString().slice(-6)}`;
  throwIfError(
    await supabase.from("client_receipts").insert({
      project_id: projectId,
      amount,
      receipt_date: new Date().toISOString().slice(0, 10),
      mode,
      receipt_no: receiptNo,
    }),
    "Couldn't record the receipt."
  );

  throwIfError(
    await supabase.from("payments").insert({
      project_id: projectId,
      direction: "inbound",
      amount,
      category: "client_receipt",
      payment_date: new Date().toISOString().slice(0, 10),
      created_by: ctx.userId,
    }),
    "Couldn't log the payment."
  );

  if (scheduleId) {
    throwIfError(
      await supabase.from("client_payment_schedules").update({ status: "paid" }).eq("id", scheduleId),
      "Couldn't mark the milestone as paid."
    );
  }

  revalidateAll();
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

export async function recordExpense(formData: FormData) {
  const ctx = await assertOwner();
  const supabase = createClient();
  const projectId = String(formData.get("project_id") || "") || null;
  const amount = Number(formData.get("amount") || 0);
  if (!amount) return;

  throwIfError(
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

  revalidatePath("/owner/finance");
}
