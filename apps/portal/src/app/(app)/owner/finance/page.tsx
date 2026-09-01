import { createClient } from "@buildhaus/database";
import { Card, Badge, StatCard, ActionForm, SubmitButton } from "@buildhaus/ui";
import { Input, Select } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";
import { recordReceipt, markSupplierBillPaid, markContractorBillPaid, recordExpense } from "./actions";

const SCHEDULE_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  paid: "ok", invoiced: "warn", pending: "muted", overdue: "danger",
};

export default async function FinancePage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: payments },
    { data: schedules },
    { data: invoices },
    { data: receipts },
    { data: supplierBills },
    { data: contractorBills },
    { data: expenses },
    { data: projects },
  ] = await Promise.all([
    supabase.from("payments").select("direction,amount,category"),
    supabase.from("client_payment_schedules").select("id,project_id,milestone,percent,amount,due_date,status,projects(code,name)").order("due_date", { ascending: true }),
    supabase.from("client_invoices").select("id,invoice_no,amount,status,invoice_date,projects(code,name)").order("invoice_date", { ascending: false }),
    supabase.from("client_receipts").select("id,receipt_no,amount,receipt_date,mode,projects(code,name)").order("receipt_date", { ascending: false }),
    supabase.from("supplier_bills").select("id,supplier_name,amount,outstanding,bill_date,projects(code,name)").order("bill_date", { ascending: false }),
    supabase.from("contractor_bills").select("id,contractor_name,outstanding,bill_date,projects(code,name)").order("bill_date", { ascending: false }),
    supabase.from("expenses").select("id,category,amount,expense_date,notes,projects(code,name)").order("expense_date", { ascending: false }),
    supabase.from("projects").select("id,code,name").order("created_at", { ascending: false }),
  ]);

  const inbound = (payments ?? []).filter((p: any) => p.direction === "inbound").reduce((a: any, p: any) => a + Number(p.amount), 0);
  const outbound = (payments ?? []).filter((p: any) => p.direction === "outbound").reduce((a: any, p: any) => a + Number(p.amount), 0);
  const cash = inbound - outbound;

  const scheduleList = schedules ?? [];
  const unpaidSchedules = scheduleList.filter((s: any) => s.status !== "paid");
  const overdueSchedules = scheduleList.filter((s: any) => s.status !== "paid" && s.due_date && s.due_date < today);

  const supplierList = (supplierBills ?? []).filter((b: any) => Number(b.outstanding) > 0);
  const contractorList = (contractorBills ?? []).filter((b: any) => Number(b.outstanding) > 0);
  const totalPayables = supplierList.reduce((a: any, b: any) => a + Number(b.outstanding), 0) + contractorList.reduce((a: any, b: any) => a + Number(b.outstanding), 0);

  const expensesTotal = (expenses ?? []).reduce((a: any, e: any) => a + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Finance</h1>
        <p className="text-sm text-muted">Cash position, client receivables, and supplier / labour payables.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Cash position" value={inr(cash)} tone={cash >= 0 ? "ok" : "danger"} />
        <StatCard label="Total received" value={inr(inbound)} tone="brand" />
        <StatCard label="Total paid out" value={inr(outbound)} tone="sand" />
        <StatCard label="Outstanding payables" value={inr(totalPayables)} tone={totalPayables ? "danger" : "ok"} />
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Record a receipt</h2>
        {(projects ?? []).length === 0 ? (
          <div className="text-sm text-muted">No projects yet.</div>
        ) : (
          <ActionForm action={recordReceipt} successMessage="Receipt recorded." className="grid gap-x-4 sm:grid-cols-4">
            <Select label="Project" name="project_id">
              {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </Select>
            <Input label="Amount (₹)" name="amount" type="number" required />
            <Select label="Mode" name="mode" defaultValue="bank_transfer">
              <option value="bank_transfer">Bank transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </Select>
            <div className="flex items-end"><SubmitButton>Record receipt</SubmitButton></div>
          </ActionForm>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ivory">Client payment schedule</h2>
          {overdueSchedules.length > 0 && <Badge tone="danger">{overdueSchedules.length} overdue</Badge>}
        </div>
        {scheduleList.length === 0 ? (
          <EmptyState title="No payment schedules yet" />
        ) : (
          <div className="divide-y divide-border">
            {scheduleList.map((s: any) => {
              const overdue = s.status !== "paid" && s.due_date && s.due_date < today;
              return (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-sandlight">{s.projects?.name ?? "—"} — {s.milestone}</div>
                    <div className="text-xs text-muted">{s.percent ? `${s.percent}% · ` : ""}due {dateLabel(s.due_date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-sand">{inr(s.amount)}</span>
                    <Badge tone={overdue ? "danger" : (SCHEDULE_TONE[s.status] ?? "muted")}>{overdue ? "overdue" : s.status}</Badge>
                    {s.status !== "paid" && (
                      <ActionForm action={recordReceipt} successMessage="Marked received.">
                        <input type="hidden" name="project_id" value={s.project_id} />
                        <input type="hidden" name="schedule_id" value={s.id} />
                        <input type="hidden" name="amount" value={s.amount} />
                        <input type="hidden" name="mode" value="bank_transfer" />
                        <SubmitButton variant="outline">Mark received</SubmitButton>
                      </ActionForm>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Invoices</h2>
          {(!invoices || invoices.length === 0) ? (
            <div className="text-sm text-muted">No invoices yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {invoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-sandlight">{inv.invoice_no}</div>
                    <div className="text-xs text-muted">{inv.projects?.name ?? "—"} · {dateLabel(inv.invoice_date)}</div>
                  </div>
                  <span className="text-sand">{inr(inv.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Receipts</h2>
          {(!receipts || receipts.length === 0) ? (
            <div className="text-sm text-muted">No receipts yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {receipts.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="text-sandlight">{r.receipt_no}</div>
                    <div className="text-xs text-muted">{r.projects?.name ?? "—"} · {dateLabel(r.receipt_date)} · {r.mode?.replace(/_/g, " ")}</div>
                  </div>
                  <span className="text-ok">{inr(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Supplier bills</h2>
        {supplierList.length === 0 ? (
          <div className="text-sm text-muted">No outstanding supplier bills.</div>
        ) : (
          <div className="divide-y divide-border">
            {supplierList.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{b.supplier_name}</div>
                  <div className="text-xs text-muted">{b.projects?.name ?? "—"} · billed {dateLabel(b.bill_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-danger">{inr(b.outstanding)}</span>
                  <form action={markSupplierBillPaid}>
                    <input type="hidden" name="bill_id" value={b.id} />
                    <SubmitButton variant="outline">Mark paid</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Contractor bills</h2>
        {contractorList.length === 0 ? (
          <div className="text-sm text-muted">No outstanding contractor bills.</div>
        ) : (
          <div className="divide-y divide-border">
            {contractorList.map((b: any) => (
              <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div>
                  <div className="text-sandlight">{b.contractor_name}</div>
                  <div className="text-xs text-muted">{b.projects?.name ?? "—"} · billed {dateLabel(b.bill_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-danger">{inr(b.outstanding)}</span>
                  <form action={markContractorBillPaid}>
                    <input type="hidden" name="bill_id" value={b.id} />
                    <SubmitButton variant="outline">Mark paid</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Expenses</h2>
        <ActionForm action={recordExpense} successMessage="Expense recorded." className="mb-4 grid gap-x-4 sm:grid-cols-4">
          <Select label="Project" name="project_id" defaultValue="">
            <option value="">— General —</option>
            {(projects ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </Select>
          <Input label="Category" name="category" placeholder="site_transport" />
          <Input label="Amount (₹)" name="amount" type="number" required />
          <Input label="Notes" name="notes" placeholder="Optional" />
          <div className="sm:col-span-4"><SubmitButton variant="outline">Add expense</SubmitButton></div>
        </ActionForm>
        {(!expenses || expenses.length === 0) ? (
          <div className="text-sm text-muted">No expenses recorded yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {expenses.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="text-sandlight">{(e.category ?? "").replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted">{e.projects?.name ?? "General"} · {dateLabel(e.expense_date)}{e.notes ? ` · ${e.notes}` : ""}</div>
                </div>
                <span className="text-sand">{inr(e.amount)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 text-sm font-semibold">
              <span className="text-muted">Total expenses</span>
              <span className="text-sand">{inr(expensesTotal)}</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
