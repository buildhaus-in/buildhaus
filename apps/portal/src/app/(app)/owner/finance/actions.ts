"use server";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertOwner() {
  const ctx = await getUserContext();
  if (!ctx || !ctx.roles.includes("owner")) throw new Error("Not authorised");
  return ctx;
}

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
  await supabase.from("client_receipts").insert({
    project_id: projectId,
    amount,
    receipt_date: new Date().toISOString().slice(0, 10),
    mode,
    receipt_no: receiptNo,
  });

  await supabase.from("payments").insert({
    project_id: projectId,
    direction: "inbound",
    amount,
    category: "client_receipt",
    payment_date: new Date().toISOString().slice(0, 10),
    created_by: ctx.userId,
  });

  if (scheduleId) {
    await supabase.from("client_payment_schedules").update({ status: "paid" }).eq("id", scheduleId);
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

  await supabase.from("supplier_bills").update({ outstanding: 0 }).eq("id", billId);
  await supabase.from("payments").insert({
    project_id: bill.project_id,
    direction: "outbound",
    amount: bill.outstanding,
    category: "supplier_payment",
    payment_date: new Date().toISOString().slice(0, 10),
    created_by: ctx.userId,
  });

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

  await supabase.from("contractor_bills").update({ outstanding: 0 }).eq("id", billId);
  await supabase.from("payments").insert({
    project_id: bill.project_id,
    direction: "outbound",
    amount: bill.outstanding,
    category: "labour_payment",
    payment_date: new Date().toISOString().slice(0, 10),
    created_by: ctx.userId,
  });

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

  await supabase.from("expenses").insert({
    organisation_id: ctx.profile!.organisation_id,
    project_id: projectId,
    category: String(formData.get("category") || "other"),
    amount,
    expense_date: new Date().toISOString().slice(0, 10),
    notes: String(formData.get("notes") || ""),
  });

  revalidatePath("/owner/finance");
}
