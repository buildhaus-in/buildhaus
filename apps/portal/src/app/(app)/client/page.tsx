import Link from "next/link";
import { createClient } from "@buildhaus/database";
import { getUserContext } from "@/lib/session";
import { Card, StatCard, ProgressBar, StatusBadge, Badge } from "@buildhaus/ui";
import { EmptyState } from "@buildhaus/ui";
import { inr, dateLabel } from "@buildhaus/utils";

export default async function ClientOverview() {
  const supabase = createClient();
  const ctx = await getUserContext();

  // RLS enforces this in production; we also filter explicitly here so the
  // client only ever sees their own project (RLS isn't present in Demo Mode).
  const { data: clientRow } = await supabase
    .from("clients").select("id").eq("profile_id", ctx?.userId ?? "").maybeSingle();

  const { data: project } = clientRow
    ? await supabase
        .from("projects")
        .select("id,code,name,site_address,status,client_visible_progress,progress,current_stage,planned_completion")
        .eq("client_id", clientRow.id).maybeSingle()
    : { data: null };

  if (!project) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-ivory">Welcome to Buildhaus</h1>
        <EmptyState
          title="Your project workspace is being set up"
          hint="Once your project is active, you'll see live progress, photos, approvals and payments here. In the meantime, your Buildhaus contact can answer any questions."
        />
      </div>
    );
  }

  const [{ data: schedule }, { data: invoices }, { data: receipts }, { data: stages }] = await Promise.all([
    supabase.from("client_payment_schedules").select("milestone,percent,amount,due_date,status")
      .eq("project_id", project.id).order("due_date", { ascending: true }),
    supabase.from("client_invoices").select("amount,status").eq("project_id", project.id),
    supabase.from("client_receipts").select("amount").eq("project_id", project.id),
    supabase.from("project_stages").select("name,status,progress,client_visible")
      .eq("project_id", project.id).eq("client_visible", true).order("seq", { ascending: true }),
  ]);

  // The client always sees the *published* progress value, never the internal one.
  const publishedProgress = project.client_visible_progress ?? 0;

  const contractValue = (schedule ?? []).reduce((a: any, s: any) => a + Number(s.amount), 0);
  const invoiced = (invoices ?? []).reduce((a: any, s: any) => a + Number(s.amount), 0);
  const paid = (receipts ?? []).reduce((a: any, s: any) => a + Number(s.amount), 0)
    || (schedule ?? []).filter((s: any) => s.status === "paid").reduce((a: any, s: any) => a + Number(s.amount), 0);
  const outstanding = Math.max(0, invoiced - paid);
  const nextDue = (schedule ?? []).find((s: any) => s.status !== "paid" && s.due_date);

  const scheduleStatusTone: Record<string, "ok" | "warn" | "danger" | "muted"> = {
    paid: "ok", invoiced: "warn", pending: "muted", overdue: "danger",
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-brand">{project.code}</div>
        <h1 className="text-xl font-bold text-ivory">{project.name}</h1>
        <p className="text-sm text-muted">{project.site_address}</p>
      </div>

      {/* Progress — clearly the value Buildhaus has published to you */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-sandlight">Overall progress</span>
          <span className="text-sm font-bold text-brand">{publishedProgress}%</span>
        </div>
        <ProgressBar value={publishedProgress} height={10} />
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
          <span>Current stage: <span className="text-sand">{project.current_stage ?? "—"}</span></span>
          <span>Target handover: <span className="text-sand">{dateLabel(project.planned_completion)}</span></span>
        </div>
      </Card>

      {/* Payment summary — correct labels, not "contract billed" */}
      <div className="flex flex-wrap gap-3">
        <Link href="/client/payments" className="flex-1 min-w-[130px]"><StatCard label="Contract Value" value={inr(contractValue)} tone="sand" /></Link>
        <Link href="/client/payments" className="flex-1 min-w-[130px]"><StatCard label="Amount Invoiced" value={inr(invoiced)} tone="brand" /></Link>
        <Link href="/client/payments" className="flex-1 min-w-[130px]"><StatCard label="Amount Paid" value={inr(paid)} tone="ok" /></Link>
        <Link href="/client/payments" className="flex-1 min-w-[130px]"><StatCard label="Outstanding" value={inr(outstanding)} tone={outstanding > 0 ? "danger" : "ok"} /></Link>
      </div>

      {nextDue && (
        <Link href="/client/payments">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted">Next payment</div>
                <div className="text-sm font-semibold text-sandlight">{nextDue.milestone}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-brand">{inr(nextDue.amount)}</div>
                <div className="text-xs text-muted">due {dateLabel(nextDue.due_date)}</div>
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Payment schedule */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ivory">Payment schedule</h2>
          <Link href="/client/payments" className="text-xs text-brand">View all →</Link>
        </div>
        {(!schedule || schedule.length === 0) ? (
          <div className="text-sm text-muted">Your payment schedule will appear here once agreed.</div>
        ) : (
          <div className="divide-y divide-border">
            {schedule.map((s: any, i: any) => (
              <Link
                key={i}
                href="/client/payments"
                className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface/50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-sandlight">{s.milestone}</div>
                  <div className="text-xs text-muted">{s.percent ? `${s.percent}% · ` : ""}due {dateLabel(s.due_date)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-sand">{inr(s.amount)}</span>
                  <Badge tone={scheduleStatusTone[s.status] ?? "muted"}>{s.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Stage progress (only client-visible stages) */}
      <Card>
        <h2 className="mb-3 font-bold text-ivory">Stage progress</h2>
        {(!stages || stages.length === 0) ? (
          <div className="text-sm text-muted">Stage-by-stage progress will appear here as work advances.</div>
        ) : (
          <div className="space-y-3">
            {stages.map((s: any, i: any) => (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-sandlight">{s.name}</span>
                  <StatusBadge status={s.status} />
                </div>
                <ProgressBar value={s.progress} tone={s.status === "completed" ? "ok" : "brand"} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link href="/client/approvals" className="text-xs text-brand">Pending approvals →</Link>
        <Link href="/client/payments" className="text-xs text-brand">Payment details →</Link>
        <Link href="/client/documents" className="text-xs text-brand">Documents →</Link>
      </div>

      <p className="text-xs text-muted">You see only the information your Buildhaus team has published for this project.</p>
    </div>
  );
}
