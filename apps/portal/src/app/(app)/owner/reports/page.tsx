import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { Card, StatCard, Badge, ProgressBar } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr } from "@buildhaus/utils";
import { assessDelay, riskTone } from "@buildhaus/utils";

export default async function ReportsPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: projects },
    { data: payments },
    { count: reportsPending },
    { count: drawingsPending },
    { count: matReqPending },
    { count: approvalsPending },
    { data: paySchedule },
    { data: supplierBills },
    { data: contractorBills },
  ] = await Promise.all([
    supabase.from("projects").select("id,code,name,status,progress,contract_value,estimated_cost,start_date,planned_completion"),
    supabase.from("payments").select("direction,amount"),
    supabase.from("daily_reports").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("drawings").select("*", { count: "exact", head: true }).eq("status", "owner_review"),
    supabase.from("material_requests").select("*", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("client_approvals").select("*", { count: "exact", head: true }).eq("status", "sent_to_client"),
    supabase.from("client_payment_schedules").select("amount,status,due_date"),
    supabase.from("supplier_bills").select("outstanding").gt("outstanding", 0),
    supabase.from("contractor_bills").select("outstanding").gt("outstanding", 0),
  ]);

  const list = projects ?? [];
  const active = list.filter((p: any) => !["completed", "cancelled"].includes(p.status));
  const health = active.map((p: any) => ({
    p,
    d: assessDelay({ startDate: p.start_date, plannedCompletion: p.planned_completion, actualProgress: p.progress }),
  }));
  const delayed = health.filter((h: any) => h.d.risk === "Delayed" || h.d.risk === "Critical");

  const inbound = (payments ?? []).filter((p: any) => p.direction === "inbound").reduce((a: any, p: any) => a + Number(p.amount), 0);
  const outbound = (payments ?? []).filter((p: any) => p.direction === "outbound").reduce((a: any, p: any) => a + Number(p.amount), 0);
  const cash = inbound - outbound;

  const contractValue = list.reduce((a: any, p: any) => a + Number(p.contract_value ?? 0), 0);
  const estimatedCost = list.reduce((a: any, p: any) => a + Number(p.estimated_cost ?? 0), 0);
  const projectedMargin = contractValue - estimatedCost;

  const overdueReceivables = (paySchedule ?? []).filter((s: any) => s.status !== "paid" && s.due_date && s.due_date < today);
  const payables = (supplierBills ?? []).reduce((a: any, b: any) => a + Number(b.outstanding), 0) + (contractorBills ?? []).reduce((a: any, b: any) => a + Number(b.outstanding), 0);

  const approvalsBacklog = (reportsPending ?? 0) + (drawingsPending ?? 0) + (matReqPending ?? 0) + (approvalsPending ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Reports &amp; Analytics</h1>
        <p className="text-sm text-muted">A portfolio-wide management summary, sliced from live data.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Active projects" value={active.length} tone="brand" />
        <StatCard label="Delayed / critical" value={delayed.length} tone={delayed.length ? "danger" : "ok"} />
        <StatCard label="Cash position" value={inr(cash)} tone={cash >= 0 ? "ok" : "danger"} />
        <StatCard label="Approvals backlog" value={approvalsBacklog} tone={approvalsBacklog ? "warn" : "ok"} />
      </div>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Portfolio financials</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Contract value (all projects)</div><div className="mt-1 text-lg font-bold text-brand">{inr(contractValue)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Estimated cost</div><div className="mt-1 text-lg font-bold text-sand">{inr(estimatedCost)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Projected margin</div><div className={`mt-1 text-lg font-bold ${projectedMargin >= 0 ? "text-ok" : "text-danger"}`}>{inr(projectedMargin)}</div></div>
          <div><div className="text-[10px] uppercase tracking-wide text-muted">Payables outstanding</div><div className="mt-1 text-lg font-bold text-danger">{inr(payables)}</div></div>
        </div>
        <div className="mt-3 text-xs text-muted">
          {overdueReceivables.length} client milestone(s) overdue, totalling {inr(overdueReceivables.reduce((a: any, s: any) => a + Number(s.amount), 0))}.
          {" "}<Link href="/owner/finance" className="text-brand">Open Finance →</Link>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Delivery health by project</h2>
        {health.length === 0 ? (
          <EmptyState title="No active projects" />
        ) : (
          <div className="space-y-3">
            {health.map(({ p, d }: any) => (
              <Link key={p.id} href={`/owner/projects/${p.id}`} className="block rounded-lg border border-border bg-surface p-3 hover:border-brand/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-sandlight">{p.name}</div>
                    <div className="text-xs text-muted">{p.code}</div>
                  </div>
                  <Badge tone={riskTone(d.risk)}>{d.risk}</Badge>
                </div>
                <div className="mt-2"><ProgressBar value={d.actualProgress} tone={riskTone(d.risk) === "danger" ? "danger" : riskTone(d.risk) === "warn" ? "warn" : "brand"} height={6} /></div>
                <div className="mt-1 text-xs text-muted">Actual {d.actualProgress}% vs planned {d.plannedProgress}% · variance {d.variance > 0 ? "+" : ""}{d.variance}%</div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold text-ivory">Approvals backlog</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Link href="/owner/site-operations" className="rounded-lg border border-border bg-surface p-3 hover:border-brand/40">
            <div className="text-lg font-bold text-warn">{reportsPending ?? 0}</div>
            <div className="text-xs text-muted">Daily reports</div>
          </Link>
          <Link href="/owner/drawings" className="rounded-lg border border-border bg-surface p-3 hover:border-brand/40">
            <div className="text-lg font-bold text-warn">{drawingsPending ?? 0}</div>
            <div className="text-xs text-muted">Drawings</div>
          </Link>
          <Link href="/owner/materials" className="rounded-lg border border-border bg-surface p-3 hover:border-brand/40">
            <div className="text-lg font-bold text-warn">{matReqPending ?? 0}</div>
            <div className="text-xs text-muted">Material requests</div>
          </Link>
          <Link href="/owner/clients" className="rounded-lg border border-border bg-surface p-3 hover:border-brand/40">
            <div className="text-lg font-bold text-warn">{approvalsPending ?? 0}</div>
            <div className="text-xs text-muted">Client approvals</div>
          </Link>
        </div>
      </Card>
    </div>
  );
}
