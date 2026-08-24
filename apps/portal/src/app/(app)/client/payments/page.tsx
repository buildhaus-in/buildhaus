import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, Badge, StatCard } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";

const SCHEDULE_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  paid: "ok", invoiced: "warn", pending: "muted", overdue: "danger",
};
const INVOICE_TONE: Record<string, "ok" | "warn" | "danger" | "muted"> = {
  paid: "ok", issued: "warn", unpaid: "muted",
};

export default async function ClientPayments() {
  const supabase = createClient();
  const ctx = await getUserContext();

  const { data: clientRow } = await supabase
    .from("clients").select("id").eq("profile_id", ctx?.userId ?? "").maybeSingle();

  const { data: project } = clientRow
    ? await supabase.from("projects").select("id,code,name").eq("client_id", clientRow.id).maybeSingle()
    : { data: null };

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-ivory">Payments</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="Your payment schedule, invoices and receipts will appear here."
        />
      </div>
    );
  }

  const [{ data: schedule }, { data: invoices }, { data: receipts }] = await Promise.all([
    supabase.from("client_payment_schedules").select("id,milestone,percent,amount,due_date,status")
      .eq("project_id", project.id).order("due_date", { ascending: true }),
    supabase.from("client_invoices").select("id,invoice_no,amount,status,invoice_date")
      .eq("project_id", project.id).order("invoice_date", { ascending: false }),
    supabase.from("client_receipts").select("id,receipt_no,amount,receipt_date,mode")
      .eq("project_id", project.id).order("receipt_date", { ascending: false }),
  ]);

  const scheduleList = schedule ?? [];
  const invoiceList = invoices ?? [];
  const receiptList = receipts ?? [];

  const contractValue = scheduleList.reduce((a: any, s: any) => a + Number(s.amount), 0);
  const invoiced = invoiceList.reduce((a: any, s: any) => a + Number(s.amount), 0);
  const paid = receiptList.reduce((a: any, s: any) => a + Number(s.amount), 0)
    || scheduleList.filter((s: any) => s.status === "paid").reduce((a: any, s: any) => a + Number(s.amount), 0);
  const outstanding = Math.max(0, invoiced - paid);
  const nextDue = scheduleList.find((s: any) => s.status !== "paid" && s.due_date);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">Payments</h1>
        <p className="text-sm text-muted">{project.name}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <a href="#schedule" className="flex-1 min-w-[130px]"><StatCard label="Contract Value" value={inr(contractValue)} tone="sand" /></a>
        <a href="#invoices" className="flex-1 min-w-[130px]"><StatCard label="Amount Invoiced" value={inr(invoiced)} tone="brand" /></a>
        <a href="#receipts" className="flex-1 min-w-[130px]"><StatCard label="Amount Paid" value={inr(paid)} tone="ok" /></a>
        <a href="#invoices" className="flex-1 min-w-[130px]"><StatCard label="Outstanding" value={inr(outstanding)} tone={outstanding > 0 ? "danger" : "ok"} /></a>
        {nextDue && (
          <a href="#schedule" className="flex-1 min-w-[130px]">
            <StatCard label="Next Payment" value={inr(nextDue.amount)} sub={`due ${dateLabel(nextDue.due_date)}`} tone="warn" />
          </a>
        )}
      </div>

      <Card id="schedule">
        <h2 className="mb-3 font-bold text-ivory">Payment schedule</h2>
        {scheduleList.length === 0 ? (
          <div className="text-sm text-muted">Your payment schedule will appear here once agreed.</div>
        ) : (
          <div className="divide-y divide-border">
            {scheduleList.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm text-sandlight">{s.milestone}</div>
                  <div className="text-xs text-muted">{s.percent ? `${s.percent}% · ` : ""}due {dateLabel(s.due_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-sand">{inr(s.amount)}</span>
                  <Badge tone={SCHEDULE_TONE[s.status] ?? "muted"}>{s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card id="invoices">
        <h2 className="mb-3 font-bold text-ivory">Invoices</h2>
        {invoiceList.length === 0 ? (
          <div className="text-sm text-muted">Invoices will appear here as they&apos;re raised.</div>
        ) : (
          <div className="divide-y divide-border">
            {invoiceList.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm text-sandlight">{inv.invoice_no}</div>
                  <div className="text-xs text-muted">{dateLabel(inv.invoice_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-sand">{inr(inv.amount)}</span>
                  <Badge tone={INVOICE_TONE[inv.status] ?? "muted"}>{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card id="receipts">
        <h2 className="mb-3 font-bold text-ivory">Receipts</h2>
        {receiptList.length === 0 ? (
          <div className="text-sm text-muted">Payment receipts will appear here once received.</div>
        ) : (
          <div className="divide-y divide-border">
            {receiptList.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm text-sandlight">{r.receipt_no}</div>
                  <div className="text-xs text-muted">{dateLabel(r.receipt_date)} · {r.mode?.replace(/_/g, " ")}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-sand">{inr(r.amount)}</span>
                  <Link href={`/client/payments/receipts/${r.id}`} className="text-xs font-semibold text-brand">
                    Download receipt →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
