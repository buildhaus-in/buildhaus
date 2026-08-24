import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { StatCard, Card, StatusBadge, Badge, ProgressBar } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";
import { assessDelay, riskTone } from "@buildhaus/utils";

// A single "needs attention" line with a count and a link to the records.
function AttentionRow({ label, count, href, tone = "warn" }:
  { label: string; count: number; href: string; tone?: "warn" | "danger" | "brand" }) {
  if (!count) return null;
  return (
    <Link href={href} className="flex items-center justify-between gap-4 py-2.5 hover:opacity-90">
      <span className="text-sm text-sandlight">{label}</span>
      <span className="flex items-center gap-2">
        <Badge tone={tone}>{count}</Badge>
        <span className="text-muted">→</span>
      </span>
    </Link>
  );
}

export default async function CommandCentre() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: activeProjects },
    { count: newEnquiries },
    { count: reportsPending },
    { count: drawingsPending },
    { count: matReqPending },
    { count: approvalsPending },
    { data: projects },
    { data: payments },
    { data: paySchedule },
    { data: supplierBills },
    { data: contractorBills },
    { count: qualityOpen },
    { count: reportsToday },
  ] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).not("status", "in", "(completed,cancelled)"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "new_enquiry"),
    supabase.from("daily_reports").select("*", { count: "exact", head: true }).eq("status", "submitted"),
    supabase.from("drawings").select("*", { count: "exact", head: true }).eq("status", "client_review"),
    supabase.from("material_requests").select("*", { count: "exact", head: true }).eq("status", "requested"),
    supabase.from("client_approvals").select("*", { count: "exact", head: true }).eq("status", "sent_to_client"),
    supabase.from("projects").select("id,code,name,status,progress,client_visible_progress,current_stage,start_date,planned_completion,contract_value,estimated_cost")
      .not("status", "in", "(completed,cancelled)").order("planned_completion", { ascending: true }).limit(8),
    supabase.from("payments").select("direction,amount"),
    supabase.from("client_payment_schedules").select("milestone,amount,due_date,status,project_id").order("due_date", { ascending: true }),
    supabase.from("supplier_bills").select("amount,outstanding,bill_date").gt("outstanding", 0),
    supabase.from("contractor_bills").select("outstanding,bill_date").gt("outstanding", 0),
    supabase.from("inspections").select("*", { count: "exact", head: true }).in("status", ["pending", "failed", "correction_pending"]),
    supabase.from("daily_reports").select("*", { count: "exact", head: true }).eq("report_date", today),
  ]);

  const inbound = (payments ?? []).filter((p: any) => p.direction === "inbound").reduce((s: any, p: any) => s + Number(p.amount), 0);
  const outbound = (payments ?? []).filter((p: any) => p.direction === "outbound").reduce((s: any, p: any) => s + Number(p.amount), 0);
  const cash = inbound - outbound;

  // Delay assessment for every active project.
  const health = (projects ?? []).map((p: any) => ({
    p,
    d: assessDelay({ startDate: p.start_date, plannedCompletion: p.planned_completion, actualProgress: p.progress }),
  }));
  const delayed = health.filter((h: any) => h.d.risk === "Delayed" || h.d.risk === "Critical").length;

  const overduePayments = (paySchedule ?? []).filter(
    (s: any) => s.status !== "paid" && s.due_date && s.due_date < today
  );
  const upcomingClient = (paySchedule ?? []).filter((s: any) => s.status !== "paid" && s.due_date && s.due_date >= today).slice(0, 4);
  const supplierDue = (supplierBills ?? []).reduce((a: any, b: any) => a + Number(b.outstanding), 0);
  const labourDue = (contractorBills ?? []).reduce((a: any, b: any) => a + Number(b.outstanding), 0);

  const pendingApprovals = (reportsPending ?? 0) + (drawingsPending ?? 0) + (matReqPending ?? 0) + (approvalsPending ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ivory">Command Centre</h1>
        <p className="text-sm text-muted">Everything that needs your attention across Buildhaus.</p>
      </div>

      {/* Four primary summary cards */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Active Projects" value={activeProjects ?? 0} tone="brand" />
        <StatCard label="New Enquiries" value={newEnquiries ?? 0} tone="warn" />
        <StatCard label="Pending Approvals" value={pendingApprovals} tone={pendingApprovals ? "danger" : "ok"} />
        <StatCard label="Cash Position" value={inr(cash)} tone={cash >= 0 ? "ok" : "danger"} />
      </div>

      {/* Needs Your Attention */}
      <Card>
        <h2 className="mb-1 font-bold text-ivory">Needs your attention</h2>
        <div className="divide-y divide-border">
          <AttentionRow label="Delayed projects" count={delayed} href="/owner/projects" tone="danger" />
          <AttentionRow label="Daily reports waiting for approval" count={reportsPending ?? 0} href="/owner/site-operations" />
          <AttentionRow label="Architect drawings waiting for review" count={drawingsPending ?? 0} href="/owner/drawings" />
          <AttentionRow label="Material requests waiting for review" count={matReqPending ?? 0} href="/owner/materials" />
          <AttentionRow label="Client approvals pending" count={approvalsPending ?? 0} href="/owner/clients" />
          <AttentionRow label="Client payments overdue" count={overduePayments.length} href="/owner/finance" tone="danger" />
          <AttentionRow label="Supplier payments due" count={(supplierBills ?? []).length} href="/owner/finance" />
          <AttentionRow label="Labour payments due" count={(contractorBills ?? []).length} href="/owner/labour" />
          <AttentionRow label="Quality issues open" count={qualityOpen ?? 0} href="/owner/quality" tone="danger" />
          {(!delayed && !reportsPending && !drawingsPending && !matReqPending && !approvalsPending &&
            !overduePayments.length && !(supplierBills ?? []).length && !(contractorBills ?? []).length && !qualityOpen) && (
            <div className="py-6 text-center text-sm text-muted">All clear — nothing needs action right now.</div>
          )}
        </div>
      </Card>

      {/* Project Health */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ivory">Project health</h2>
          <Link href="/owner/projects" className="text-xs text-brand">All projects →</Link>
        </div>
        {health.length === 0 ? (
          <div className="text-sm text-muted">No active projects yet.</div>
        ) : (
          <div className="space-y-4">
            {health.map(({ p, d }: any) => (
              <Link key={p.id} href={`/owner/projects/${p.id}`} className="block rounded-lg border border-border bg-surface p-3 hover:border-brand/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-sandlight">{p.name}</div>
                    <div className="text-xs text-muted">{p.code} · {p.current_stage ?? "—"}</div>
                  </div>
                  <Badge tone={riskTone(d.risk)}>{d.risk}</Badge>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">Actual</div>
                    <div className="text-sm font-semibold text-ink">{d.actualProgress}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">Planned</div>
                    <div className="text-sm font-semibold text-ink">{d.plannedProgress}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">Variance</div>
                    <div className={`text-sm font-semibold ${d.variance < 0 ? "text-danger" : "text-ok"}`}>{d.variance > 0 ? "+" : ""}{d.variance}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted">Delay</div>
                    <div className={`text-sm font-semibold ${d.delayDays > 0 ? "text-danger" : "text-ok"}`}>{d.delayDays > 0 ? `${d.delayDays}d` : "—"}</div>
                  </div>
                </div>
                <div className="mt-2"><ProgressBar value={d.actualProgress} tone={riskTone(d.risk) === "danger" ? "danger" : riskTone(d.risk) === "warn" ? "warn" : "brand"} height={6} /></div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today Across Sites */}
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Today across sites</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Reports submitted today</span><span className="text-sandlight">{reportsToday ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted">Active projects</span><span className="text-sandlight">{activeProjects ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted">Open quality issues</span><span className="text-sandlight">{qualityOpen ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted">Material requests pending</span><span className="text-sandlight">{matReqPending ?? 0}</span></div>
          </div>
          <Link href="/owner/site-operations" className="mt-3 inline-block text-xs text-brand">Open Site Operations →</Link>
        </Card>

        {/* Upcoming Financial Commitments */}
        <Card>
          <h2 className="mb-3 font-bold text-ivory">Upcoming financial commitments</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted">Client payments expected</span><span className="text-ok">{inr(upcomingClient.reduce((a: any, s: any) => a + Number(s.amount), 0))}</span></div>
            <div className="flex justify-between"><span className="text-muted">Supplier payments due</span><span className="text-danger">{inr(supplierDue)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Labour bills due</span><span className="text-danger">{inr(labourDue)}</span></div>
          </div>
          {upcomingClient.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">Next client milestones</div>
              {upcomingClient.map((s: any, i: any) => (
                <div key={i} className="flex justify-between py-1 text-xs">
                  <span className="text-sandlight">{s.milestone}</span>
                  <span className="text-muted">{inr(s.amount)} · {dateLabel(s.due_date)}</span>
                </div>
              ))}
            </div>
          )}
          <Link href="/owner/finance" className="mt-3 inline-block text-xs text-brand">Open Finance →</Link>
        </Card>
      </div>
    </div>
  );
}
